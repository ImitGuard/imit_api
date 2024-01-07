// @ts-check
const { test, expect } = require("@playwright/test");

test("login to user", async({ request }) => {
    const user = await request.post("http://127.0.0.1:3000/login", {
        data: {
            username: "arellak",
            password: "deinemama",
        }
    });

    expect((await user.json()).code).toBe(1);
});

test("get user data", async({ request }) => {
    const user = await request.get("http://127.0.0.1:3000/user/12");

    expect((await user.json()).code).toBe(1);
});


