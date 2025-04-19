/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fork } from 'child_process';
import path from 'path';

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { Tool } from './tool';

const install: Tool = {
  capability: 'install',
  schema: {
    name: 'browser_install',
    description: 'Install the browser specified in the config. Call this if you get an error about the browser not being installed.',
    inputSchema: zodToJsonSchema(z.object({})),
  },

  handle: async context => {
    const channel = context.options.launchOptions?.channel ?? context.options.browserName ?? 'chrome';
    const cli = path.join(require.resolve('playwright/package.json'), '..', 'cli.js');
    const child = fork(cli, ['install', channel], {
      stdio: 'pipe',
    });
    const output: string[] = [];
    child.stdout?.on('data', data => output.push(data.toString()));
    child.stderr?.on('data', data => output.push(data.toString()));
    await new Promise<void>((resolve, reject) => {
      child.on('close', code => {
        if (code === 0)
          resolve();
        else
          reject(new Error(`Failed to install browser: ${output.join('')}`));
      });
    });
    return {
      content: [{
        type: 'text',
        text: `Browser ${channel} installed`,
      }],
    };
  },
};

export default [
  install,
];
