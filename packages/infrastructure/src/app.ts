#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { RcmStack } from './stacks/rcm-stack.js';

const app = new App();

new RcmStack(app, 'RcmStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Revenue Cycle Management application infrastructure',
});
