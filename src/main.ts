import { Config } from './config';
import * as core from '@actions/core';
import { setOutput } from './utils/set-output';
import { startEc2Instance } from './aws/start-ec2-instance';
import { terminateEc2Instance } from './aws/terminate-ec2-instance';
import { waitEc2InstanceRunning } from './aws/wait-ec2-instance-running';
import { getGitHubRegistrationToken } from './github/get-registration-token';
import { waitGitHubRunnerRegistered } from './github/wait-github-runner-registered';
import { unregisterGitHubRunner } from './github/unregister-github-runner';

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Read inputs and validate configuration.
    const config = new Config();

    // Decider for the action mode.
    if (config.mode === 'start') {
      // Create github registration token and
      const token = await getGitHubRegistrationToken(config);

      // Start the EC2 instance.
      const { instanceId, label } = await startEc2Instance(config, token);

      // Set the output of the action.
      setOutput(label, instanceId);

      // Wait for the EC2 instance to be running and the GitHub runner to be registered.
      await Promise.all([waitEc2InstanceRunning(config, instanceId), waitGitHubRunnerRegistered(config, label)]);
    } else if (config.mode === 'stop') {
      // Destructure the config to get the GitHub token and label.
      const { instanceId, githubToken, label } = config;

      // Terminate the EC2 instance and unregister the GitHub runner.
      await Promise.all([terminateEc2Instance(instanceId!), unregisterGitHubRunner(githubToken!, label!)]);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error');
    }
  }
}
