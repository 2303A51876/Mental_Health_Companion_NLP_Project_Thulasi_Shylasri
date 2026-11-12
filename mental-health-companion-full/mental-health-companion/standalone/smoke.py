import asyncio, sys, json
from playwright.async_api import async_playwright
URL = "file:///home/claude/mental-health-companion/standalone/mental-health-companion-app.html"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width":1280,"height":900}); pg = await ctx.new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append("PAGEERROR: "+str(e))); pg.on("console", lambda m: errs.append("CONSOLE "+m.type+": "+m.text) if m.type=="error" and "fonts" not in m.text.lower() and "ERR_" not in m.text else None)
        await pg.goto(URL); await pg.wait_for_timeout(500)
        print("landing h1:", (await pg.inner_text("h1"))[:70])
        # guest demo: 3 test inputs
        for t in ["I am under a lot of pressure and I am unable to sleep properly.","I had a great day and felt really relaxed.","Work is annoying but manageable."]:
            await pg.fill("#demoText", t); await pg.click("[data-act=demoAnalyze]"); await pg.wait_for_timeout(1900)
            print("  demo ->", " | ".join([ (await x.inner_text()).replace("\n"," ") for x in await pg.query_selector_all("#pipe .step")]))
        await pg.fill("#demoText", "anything"); await pg.click("[data-act=demoAnalyze]"); await pg.wait_for_timeout(300)
        print("  4th guest analysis ->", (await pg.inner_text("#demoOut"))[:60])
        # crisis in guest mode
        await pg.evaluate("sessionStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.fill("#demoText", "I feel like I can't go on anymore."); await pg.click("[data-act=demoAnalyze]"); await pg.wait_for_timeout(400)
        print("crisis overlay visible:", await pg.is_visible("#overlay"), "|", (await pg.inner_text("#overlay h1"))[:50])
        await pg.click("#overlay [data-act=closeOverlay]")
        await pg.screenshot(path="/tmp/shot_landing.png")
        # into app -> onboarding
        await pg.goto(URL+"#/app/dashboard"); await pg.wait_for_timeout(400)
        print("onboarding modal:", await pg.is_visible("#modal"))
        await pg.click("#obAccept"); await pg.click("[data-act=obNext]"); await pg.fill("#obName","Asha"); await pg.click("[data-act=obNext]"); await pg.fill("#obCn","Mum"); await pg.fill("#obCp","+919999900000"); await pg.click("[data-act=obFinish]"); await pg.wait_for_timeout(400)
        print("dashboard greeting:", (await pg.inner_text("h1"))[:40])
        # new entry flow
        await pg.goto(URL+"#/app/new"); await pg.wait_for_timeout(300)
        await pg.fill("#etext","I am under a lot of pressure and I am unable to sleep properly."); await pg.click("[data-act=tag][data-t=sleep]"); await pg.click("[data-act=analyze]"); await pg.wait_for_timeout(700)
        print("result badges:", (await pg.inner_text("#result .grid.g3")).replace("\n"," ")[:150])
        await pg.screenshot(path="/tmp/shot_result.png", full_page=True)
        await pg.click("[data-act=saveEntry]"); await pg.wait_for_timeout(400)
        print("journal entries shown:", len(await pg.query_selector_all("#jlist .entry")))
        # crisis via entry
        await pg.goto(URL+"#/app/new"); await pg.wait_for_timeout(300)
        await pg.fill("#etext","I feel like I can't go on anymore."); await pg.click("[data-act=analyze]"); await pg.wait_for_timeout(800)
        print("entry crisis overlay:", await pg.is_visible("#overlay"), "| contact link:", await pg.get_attribute("#overlay a.btn.navy","href"))
        await pg.screenshot(path="/tmp/shot_crisis.png")
        await pg.click("#overlay [data-act=closeOverlay]")
        # samples + tracker
        await pg.goto(URL+"#/app/tracker"); await pg.wait_for_timeout(300)
        await pg.click("[data-act=loadSamples]"); await pg.wait_for_timeout(900)
        print("tracker svgs:", len(await pg.query_selector_all("main svg")), "| summary:", (await pg.inner_text(".card.tint p"))[:110])
        await pg.screenshot(path="/tmp/shot_tracker.png", full_page=True)
        # visit every app route
        for r in ["dashboard","new","chat","journal","tracker","toolkit","toolkit/cbt","toolkit/grounding","assess","assess/PHQ9","goals","recs","pros","safety","privacy","settings","help","admin","about","menu"]:
            await pg.goto(URL+"#/app/"+r); await pg.wait_for_timeout(150)
            h = await pg.inner_text("main h1") if await pg.query_selector("main h1") else "NO H1"
            print(f"  route {r:18s}-> {h[:40]}")
        # chat
        await pg.goto(URL+"#/app/chat"); await pg.fill("#chatin","Work has been overwhelming and I cannot sleep"); await pg.click("[data-act=chatSend]"); await pg.wait_for_timeout(1300)
        print("chat msgs:", len(await pg.query_selector_all(".msg")))
        # PHQ-9 submit
        await pg.goto(URL+"#/app/assess/PHQ9"); await pg.wait_for_timeout(200)
        for i in range(9): await pg.check(f"input[name=q{i}][value='1']")
        await pg.click("[data-act=submitQ]"); await pg.wait_for_timeout(300)
        print("PHQ9 item9>0 triggers support screen:", await pg.is_visible("#overlay"))
        await pg.click("#overlay [data-act=closeOverlay]"); await pg.click("#modal [data-act=closeModal], #modal a")
        # admin checks
        await pg.goto(URL+"#/app/admin"); await pg.wait_for_timeout(300)
        print("admin checks pass badges:", await pg.locator("table.t tbody tr:nth-child(-n+4) .b-positive").count(), "of 4")
        # dark mode + mobile screenshot
        await pg.evaluate("S.profile.theme='dark'; save(); applyPrefs();"); await pg.goto(URL+"#/app/dashboard"); await pg.wait_for_timeout(200); await pg.screenshot(path="/tmp/shot_dark.png")
        m = await b.new_context(viewport={"width":390,"height":800}, device_scale_factor=2); mp = await m.new_page()
        await mp.goto(URL); await mp.wait_for_timeout(400); await mp.screenshot(path="/tmp/shot_mobile.png")
        ov = await mp.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"); print("mobile horizontal overflow:", ov)
        print("\nJS errors:", errs or "none")
        await b.close()
asyncio.run(main())
