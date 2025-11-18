#!/usr/bin/env node --no-warnings=ExperimentalWarning
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { setTimeout } from 'timers/promises';
import { execa } from 'execa';
import os from 'os';
import pkg from './package.json' with {type: 'json'};
import { checkUpdateExit } from './update-notifier.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const CONFIG_PATH = `${os.homedir()}/awssopilot.config`;

const argv = yargs(hideBin(process.argv)).exitProcess(false).help(false).parse();

if (argv.skipUpdate !== true) {
    await checkUpdateExit({
        author: pkg.author,
        repository: pkg.repository.name,
        name: pkg.name,
        version: pkg.version
    })
}

init().catch((error) => {
    console.error(error.message);
    process.exit(1);
});

async function init() {

    const args = getYargs();

    // config
    const data = readFileSync(CONFIG_PATH, "utf8");
    const config = JSON.parse(data);

    const profiles = getProfiles(args._, config.profiles);

    const skipYawsso = args.skipYawsso || config.skipYawsso === true;

    // check aws installed
    await execa`aws --version`;

    // check yawsso installed
    if (!skipYawsso) {
        await execa`yawsso --version`;
    } else {
        console.log('Skipping YAWSSO presence check (per skip flag/config)');
    }

    for (const profile of profiles) {

        console.log(`Setting profile: ${profile}`);

        const execaProcess = execa({ reject: false })`aws sso login --profile ${profile} --no-browser`;

        for await (const line of execaProcess) {
            if (!line.startsWith('https://')) {
                continue;
            }
            const url = line;

            // browser
            const browser = await puppeteer.launch({ headless: true, args: ['--lang=en'] });
            const page = (await browser.pages())[0];

            // load page
            console.log(`    Loading url: ${url}`);
            await page.goto(url);

            // user
            console.log('    Logging user...');
            await page.waitForSelector('input[type="email"]', { visible: true });
            await page.type('input[type="email"]', config.email);
            await page.click('input[type="submit"]');

            // password
            await page.waitForSelector('input[type="password"]', { visible: true });
            await setTimeout(1000);
            await page.type('input[type="password"]', config.password);
            await page.click('input[type="submit"]');

            // call
            if (config.type === 'call') {
                // login with call
                console.log('    Logging with phone call...');
                try {
                    await page.waitForSelector('#signInAnotherWay', { timeout: 5000 });
                    await page.click('#signInAnotherWay');
                } catch (error) {
                    // no need signInAnotherWay, already in another way
                }

                // select phone
                console.log('    Selecting phone...');
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

            // check if user already approved
            let approved;
            try {
                await page.locator(`h4 ::-p-text("Request approved")`).wait({ timeout: 5000 });
                approved = true;
            } catch (error) {
                approved = false;
            }

            if (!approved) {
                // allow cookies
                console.log('    Accept cookies...');
                await page.waitForSelector('button[aria-label="Accept all cookies"]', { visible: true });
                await page.click('button[aria-label="Accept all cookies"]');
            }

            // confirm code
            // console.log('    Approving code...');
            // await page.waitForSelector('#cli_verification_btn');
            // await page.click('#cli_verification_btn');

            // check if user already approved
            try {
                await page.locator(`h4 ::-p-text("Request approved")`).wait({ timeout: 5000 });
                approved = true;
            } catch (error) {
                approved = false;
            }

            // allow access
            if (!approved) {
                console.log('    Approving access...');
                await page.locator(`span ::-p-text("Allow access")`).wait();
                await page.locator(`span ::-p-text("Allow access")`).click();
                await page.locator(`div ::-p-text("Request approved")`).wait();
            }

            // wait to close browser
            console.log('    Awaiting to close browser...');
            await setTimeout(2000);

            // close browser
            await browser.close();

            // close process
            console.log('    Awaiting graceful time...');
            await setTimeout(3000);
            execaProcess.kill();

            // yawsso
            if (!skipYawsso) {
                console.log('    Executing YAWSSO...');
                await execa`yawsso -p ${profile}:${profile}-iam`;
            } else {
                console.log('    Skipping YAWSSO presence check (per skip flag/config)');
            }

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

function getProfiles(argv, profiles) {
    const invalidProfiles = argv.filter(profile => !profiles.includes(profile));
    if (invalidProfiles.length > 0) {
        throw new Error(`Invalid profiles: '${invalidProfiles.join(", ")}' not found in ${CONFIG_PATH}`);
    }
    return argv.length > 0
        ? profiles.filter(profile => argv.includes(profile))
        : profiles;
}

function getYargs() {
    const yarg = yargs(hideBin(process.argv));
    return yarg.scriptName(pkg.name).usage('Usage: $0 [profile] [profile] ...')
        .option('skip-update', {
            description: 'Skip checking for updates',
            type: 'boolean',
            default: false
        })
        .option('skip-yawsso', {
            description: 'Skip executing YAWSSO sync',
            type: 'boolean',
            default: false
        })
        .strictOptions()
        .version(pkg.version).alias('version', 'v')
        .showHelpOnFail(false, 'Specify --help for available options')
        .help().alias('help', 'h')
        .parserConfiguration({
            'short-option-groups': false
        })
        .fail(error => {
            console.error(error);
            console.error();
            yarg.showHelp();
            process.exit(1);
        })
        .argv;
}