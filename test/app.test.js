const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');

test('Health endpoint returns OK', async (t) => {
    const port = 3100 + Math.floor(Math.random() * 1000);

    const child = spawn(
        process.execPath,
        [path.join(__dirname, '..', 'index.js')],
        {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, PORT: String(port) },
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );

    let logs = '';
    child.stdout.on('data', data => logs += data.toString());
    child.stderr.on('data', data => logs += data.toString());

    t.after(async () => {
        if (child.exitCode === null) {
            child.kill();
            await new Promise(resolve => child.once('exit', resolve));
        }
    });

    const url = `http://127.0.0.1:${port}/health`;
    const deadline = Date.now() + 10000;
    let response;

    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(`Application stopped early: ${logs}`);
        }

        try {
            response = await fetch(url);
            break;
        } catch {
            await delay(200);
        }
    }

    assert.ok(response, `Application did not start: ${logs}`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'coupon-system');
});
