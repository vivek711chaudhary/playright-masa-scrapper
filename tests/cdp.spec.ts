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

import { test, expect } from './fixtures';

test('cdp server', async ({ cdpEndpoint, startClient }) => {
  const client = await startClient({ args: [`--cdp-endpoint=${cdpEndpoint}`] });
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: {
      url: 'data:text/html,<html><title>Title</title><body>Hello, world!</body></html>',
    },
  })).toContainTextContent(`- text: Hello, world!`);
});

test('cdp server reuse tab', async ({ cdpEndpoint, startClient }) => {
  const client = await startClient({ args: [`--cdp-endpoint=${cdpEndpoint}`] });

  expect(await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Hello, world!',
      ref: 'f0',
    },
  })).toHaveTextContent(`Error: No current snapshot available. Capture a snapshot of navigate to a new location first.`);

  expect(await client.callTool({
    name: 'browser_snapshot',
    arguments: {},
  })).toHaveTextContent(`
- Ran code:
\`\`\`js
// <internal code to capture accessibility snapshot>
\`\`\`

- Page URL: data:text/html,hello world
- Page Title: 
- Page Snapshot
\`\`\`yaml
- text: hello world
\`\`\`
`);
});
