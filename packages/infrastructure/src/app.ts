#!/usr/bin/env node
import 'source-map-support/register.js'
import { App } from 'aws-cdk-lib'
import { RcmStack } from './stacks/rcm-stack.js'

const app = new App()

new RcmStack(app, 'RcmStack', {
  description: 'Revenue Cycle Management application infrastructure',
})
