const { test, describe, beforeEach, afterEach, beforeAll, afterAll, expect } = require('@playwright/test');
const { chromium } = require('playwright');

const host = 'http://localhost:3000'; // Application host (NOT service host - that can be anything)

let browser;
let context;
let page;

let user = {
    username : "",
    email : "",
    password : "123456",
    confirmPass : "123456",
};

describe("e2e tests", () => {
    beforeAll(async () => {
        browser = await chromium.launch();
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
    });

    afterEach(async () => {
        await page.close();
        await context.close();
    });

    
    describe("authentication", () => {
        test("register makes correct API call", async () => {
            await page.goto(host);
            await page.click('text=Register');

            await page.waitForSelector('form');

            let random = Math.floor(Math.random() * 1000);

            user.username = `username_${random}`;
            user.email = `abv_${random}@abv.bg`;

            await page.locator("#username").fill(user.username);
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.locator("#repeatPass").fill(user.confirmPass);
            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes('/users/register') && response.status() === 200),
                page.click('[type="submit"]')
            ]);
            
            await expect(response.ok()).toBeTruthy();
            let userData = await response.json();

            expect(userData.email).toBe(user.email);
            expect(userData.password).toEqual(user.password);
        });

        test("login makes correct API call", async () => {
            await page.goto(host);
            await page.click('text=Login');

            await page.waitForSelector('form');
            
            
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes("/users/login") && response.status() === 200),
                page.click('[type="submit"]')
            ]);
            
            expect(response.ok()).toBeTruthy();
            let userData = await response.json();
            //console.log(userData);
            expect(userData.email).toBe(user.email);
            expect(userData.password).toEqual(user.password);
        });

        test('logout makes correct API call', async () => {
            await page.goto(host);
            await page.click('text=Login');

            await page.waitForSelector('form');
            
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.click('[type="submit"]');

            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes("/users/logout") && response.status() === 204),
                page.locator('nav >> text=Logout').click()
            ]);

            expect(response.ok).toBeTruthy();
            await page.waitForSelector('nav >> text=Login');

            expect(page.url()).toBe(host + "/");
        });
    })

    describe("navbar", () => {
        test('logged user should see correct navigation', async () => {
            await page.goto(host);

            await page.click('text=Login');
            await page.waitForSelector('form');
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.click('[type="submit"]')

            await expect(page.locator('nav >> text=All memes')).toBeVisible();
            await expect(page.locator('nav >> text=Create Meme')).toBeVisible();
            await expect(page.locator('nav >> text=My Profile')).toBeVisible();
            await expect(page.locator('nav >> text=Logout')).toBeVisible();
            await expect(page.locator('nav >> text=Login')).toBeHidden();
            await expect(page.locator('nav >> text=Register')).toBeHidden();
        });

        test('guest user should see correct navigation', async () => {
            await page.goto(host);

            await expect(page.locator('nav >> text=All memes')).toBeVisible();
            await expect(page.locator('nav >> text=Create Meme')).toBeHidden();
            await expect(page.locator('nav >> text=My Profile')).toBeHidden();
            await expect(page.locator('nav >> text=Logout')).toBeHidden();
            await expect(page.locator('nav >> text=Login')).toBeVisible();
            await expect(page.locator('nav >> text=Register')).toBeVisible();
        });
    });

    describe("CRUD", () => {
        beforeEach(async () => {
            await page.goto(host);

            await page.click('text=Login');
            await page.waitForSelector('form');
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.click('[type="submit"]')
        });

        test('create makes correct API call for logged in user', async () => {
            await page.click('text=Create Meme');
            await page.waitForSelector('form');

            await page.fill('[name="title"]', "Random title");
            await page.fill('[name="description"]', "Random description");
            await page.fill('[name="imageUrl"]', "https://jpeg.org/images/jpeg-home.jpg");

            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes("/data/memes") && response.status() === 200),
                page.click('[type="submit"]')
            ]);

            await expect(response.ok()).toBeTruthy();
            let memeData = await response.json();
            
            expect(memeData.title).toEqual('Random title');
            expect(memeData.description).toEqual('Random description');
            expect(memeData.imageUrl).toEqual('https://jpeg.org/images/jpeg-home.jpg');
        });

        
        // test('details show edit/delete buttons for owner', async () => {
        //     await page.click('text=My Profile');

        //     await page.locator(`text=Details`).first().click();

        //     await expect(page.locator('text="Delete"')).toBeVisible();
        //     await expect(page.locator('text="Edit"')).toBeVisible();
        // });

        test('edit makes correct API call', async () => {
            await page.click('text=My Profile');

            await page.locator(`text=Details`).first().click();
            await page.click('text=Edit');

            await page.waitForSelector('form');

            await page.locator('[name="title"]').fill( 'Random title_edit');

            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes("/data/memes") && response.status() === 200),
                page.click('[type="submit"]')
            ]);

            expect(response.ok).toBeTruthy();
            let memeData = await response.json()
            
            expect(memeData.title).toEqual('Random title_edit');
            expect(memeData.description).toEqual('Random description');
            expect(memeData.imageUrl).toEqual('https://jpeg.org/images/jpeg-home.jpg');
        });

        test('delete makes correct API call for owner', async () => {
            await page.click('text=My Profile');

            await page.locator(`text=Details`).first().click();

            let [response] = await Promise.all([
                page.waitForResponse(response => response.url().includes("/data/memes") && response.status() === 200),
                await page.click('text=Delete')
            ]);

            expect(response.ok()).toBeTruthy();
        });
    })
})