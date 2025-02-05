import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from '@aws-cdk/pipelines';
import { CdkpipelinesDemoStage } from './cdkpipelines-demo-stage';

/**
 * The stack that defines the application pipeline
 */
export class CdkpipelinesDemoPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      // The pipeline name
      pipelineName: 'MyServicePipeline',

      // How it will be built and synthesized
      synth: new ShellStep('Synth', {
        // Where the source can be found
        input: CodePipelineSource.gitHub('studiojms/js-bootcamp-cdk-pipelines-intro', 'main'),

        // Install dependencies, build and run cdk synth
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    // This is where we add the application stages
    const preProd = new CdkpipelinesDemoStage(this, 'PreProd', {
      env: { account: '341538094609', region: 'us-east-1' },
    });

    pipeline.addStage(preProd, {
      post: [
        new ShellStep('TestService', {
          commands: [
            //use curl to GET the given URL and fail if it returns an error
            'curl -Ssf $ENDPOINT_URL',
          ],
          envFromCfnOutputs: {
            ENDPOINT_URL: preProd.urlOutput,
          },
        }),
      ],
    });

    const prod = new CdkpipelinesDemoStage(this, 'Prod', {
      env: { account: '341538094609', region: 'us-east-1' },
    });

    pipeline.addStage(prod, {
      pre: [new ManualApprovalStep('PromoteToProd')],
    });
  }
}
