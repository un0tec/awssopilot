#!/usr/bin/env node --no-warnings=ExperimentalWarning
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { setTimeout } from 'timers/promises';
import { execa } from 'execa';
import os from 'os';
import pkg from './package.json' with {type: 'json'};
import { checkUpdate } from './update-notifier.js';

const updateAvailable = await checkUpdate({
    author: pkg.author,
    repository: pkg.repository.name,
    name: pkg.name,
    version: pkg.version
})

if (updateAvailable) { process.exit(); }

init().catch((error) => {
    console.error(error.message);
    process.exit(1);
});

async function init() {

    // config
    const data = readFileSync(os.homedir() + "/awssopilot.config", "utf8");
    const config = JSON.parse(data);

    // check aws installed
    await execa`aws --version`;

    // check yawsso installed
    await execa`yawsso --version`;

    for (const profile of config.profiles) {

        console.log(`Setting profile: ${profile}`);

        const execaProcess = execa({ reject: false })`aws sso login --profile ${profile} --no-browser`;

        for await (const line of execaProcess) {
            if (!line.includes('?user_code')) {
                continue;
            }
            const url = line;

            // browser
            const browser = await puppeteer.launch({ headless: true, args: ['--lang=en'] });
            const page = (await browser.pages())[0];

            // load page
            console.log(`    Loading url: ${url}`);
            await page.goto(url);

            // confirm code
            console.log('    Approving code...');
            await page.waitForSelector('#cli_verification_btn');
            await page.click('#cli_verification_btn');

            // user
            console.log('    Logging user...');
            await page.waitForSelector('input[type="email"]');
            await page.type('input[type="email"]', config.email);
            await page.click('input[type="submit"]');

            // password
            await page.waitForSelector('input[type="password"]');
            await setTimeout(1000);
            await page.type('input[type="password"]', config.password);
            await page.click('input[type="submit"]');

            // call
            if (config.type === 'call') {
                // login with call
                console.log('    Logging with phone call...');
                await page.waitForSelector('#signInAnotherWay');
                await page.click('#signInAnotherWay');

                // select phone
                await page.waitForSelector('#idDiv_SAOTCS_Title');
                await page.locator(`div ::-p-text("Call +XX XXXXXXX${config.phone}")`).click();
                console.log('    Awaiting approval call...');
            }

            // app
            if (config.type === 'app') {
                // show code
                console.log('    Loading app code...');
                const element = await page.waitForSelector('#idRichContext_DisplaySign');
                const text = await page.evaluate(element => element.textContent, element);
                console.log(`    Awaiting approval of code: ${text}`);
            }

            // submit stay logged
            await page.waitForSelector('#KmsiDescription', { delay: 60 });
            await page.click('input[type="submit"]');

            // allow cookies
            await page.waitForSelector('button[aria-label="Accept all cookies"]');
            await page.click('button[aria-label="Accept all cookies"]');

            // allow access
            console.log('    Approving access...');
            await page.locator(`span ::-p-text("Allow access")`).wait();
            await page.locator(`span ::-p-text("Allow access")`).click();
            await page.locator(`div ::-p-text("Request approved")`).wait();

            // close browser
            await browser.close();

            // close process
            console.log('    Awaiting graceful time...');
            await setTimeout(3000);
            execaProcess.kill();

            // yawsso
            console.log('    Executing YAWSSO...');
            await execa`yawsso -p ${profile}:${profile}-iam`;

            // logs
            const logMessage = `    IAM profile '${profile}-iam' configured `;
            console.log('-'.repeat(logMessage.length));
            console.log(`    SSO profile '${profile}' token renewed`);
            console.log(logMessage);
            console.log('-'.repeat(logMessage.length));
            break;
        }
    }

}