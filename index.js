const path = require('path');
const { writeFile, stat } = require('fs-extra');
const puppeteerCore = require('puppeteer-core');
const express = require('express');
const getPort = require('get-port');

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
    await stat(path.resolve(input));

    if (input.match(/^http/)) {
        return [input, async () => { }];
    }

    const app = express();

    app.use(express.static(input));

    const port = await getPort();

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
        return await puppeteerCore.launch({ args, executablePath: process.env.SB_CHROMIUM_PATH });
    } catch (e) {
        // it's not installed
        console.log('installing puppeteer...');
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line global-require
            require('child_process').exec(
                `node ${require.resolve(path.join('puppeteer-core', 'install.js'))}`,
                (error) => (error ? reject(error) : resolve(puppeteerCore.launch({ args })))
            );
        });
    }
};

export async function extract(input, targetPath) {
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