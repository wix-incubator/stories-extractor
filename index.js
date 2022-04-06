import { resolve as _resolve, join } from 'path';
import { writeFile, stat } from 'fs-extra';
import { launch } from 'puppeteer-core';
import express, { static as expressStatic } from 'express';
import fp from "find-free-port";

const read = async (url) => {
    const browser = await usePuppeteerBrowser();
    const page = await browser.newPage();

    await page.goto(url);
       
    await page.waitForFunction(`
    (window.__STORYBOOK_PREVIEW__ && window.__STORYBOOK_PREVIEW__.extract && window.__STORYBOOK_PREVIEW__.extract()) ||
    (window.__STORYBOOK_STORY_STORE__ && window.__STORYBOOK_STORY_STORE__.extract && window.__STORYBOOK_STORY_STORE__.extract())
  `);
    const data = JSON.parse(
        await page.evaluate(async () => {
            // eslint-disable-next-line no-undef
            return JSON.stringify(window.__STORYBOOK_STORY_STORE__.getStoriesJsonData(), null, 2);
        })
    );

    setImmediate(() => {
        browser.close();
    });
    return data;
};

const useLocation = async (input) => {
    // check for input's existence
    await stat(_resolve(input));

    if (input.match(/^http/)) {
        return [input, async () => { }];
    }

    const app = express();
    const port = await fp(3000);

    app.use(expressStatic(input));

    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            const result = `http://localhost:${port}/iframe.html`;

            console.log(`connecting to: ${result}`);

            resolve([result, server.close.bind(server)]);
        });
    });
};

const usePuppeteerBrowser = async () => {
    const args = ['--no-sandbox ', '--disable-setuid-sandbox'];
    try {
        return await launch({ args, executablePath: process.env.SB_CHROMIUM_PATH });
    } catch (e) {
        // it's not installed
        console.log('installing puppeteer...');
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line global-require
            require('child_process').exec(
                `node ${require.resolve(join('puppeteer-core', 'install.js'))}`,
                (error) => (error ? reject(error) : resolve(launch({ args })))
            );
        });
    }
};

async function extract(input, targetPath) {
    console.log(`input: ${input}`);
    console.log(`targetPath: ${targetPath}`);
    if (input && targetPath) {
        const [location, exit] = await useLocation(input);

        const data = await read(location);

        await writeFile(targetPath, JSON.stringify(data, null, 2));

        await exit();
    } else {
        throw new Error(
            'Extract: please specify a path where your built-storybook is (can be a public url) and a target directory'
        );
    }
}

console.log(`process.argv: ${process.argv}`)
extract(process.argv[2],process.argv[3]);