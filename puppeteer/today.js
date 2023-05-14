import { writeFileSync } from "fs";
import puppeteer from "puppeteer";

const scraper = () => {
  const games = [...document.querySelectorAll(".live, .pregame")]
    .map((g) => {
      const url = g.querySelector(`a[href^="/score"]`).href;
      const score = g.querySelector(".score")
        ? g.querySelector(".score").textContent
        : "";
      const [home, road] = [
        ...g.querySelectorAll(
          ".team_left2 img, .team_right2 img, .team_left img, .team_right img"
        ),
      ].map((el) => el.getAttribute("title"));
      const [place, status] = g
        .querySelector(".info")
        .textContent.trim()
        .match(/（(.*)）([\s\S]*)/)
        .slice(1, 3)
        .map((s) => s.trim().replace("　", ""));
      return {
        url,
        home,
        road,
        score,
        place,
        status,
      };
    })
    .filter((obj) => obj.status !== "中止" && obj.status !== "ノーゲーム");

  const date = document.querySelector(`#games_wrapper h4 a[href^="/games/"]`)?.textContent
    .match(/\d+月\d+日（.）/)[0]
    .split(/月|日/)
    .slice(0, 2)
    .map((n) => `${n}`.padStart(2, "0"))
    .reduce((a, c) => `2023-${a}-${c}`)
    ;
  return { date, games }
};

(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: {
      width: 1200,
      height: 1100,
    },
    headless: "new",
  });

  const page = await browser.newPage();

  const targetURL = `https://npb.jp/`;
  await page.goto(targetURL);
  await page.waitForSelector(".info");
  const data = await page.evaluate(scraper);

  await browser.close();

  const output = JSON.stringify(data.games.map((game) => Object.assign({ date: data.date }, game)), null, 2);
  console.log(output);

  const scheduled = data.games.length;
  const finished = data.games.filter((obj) => obj.status == "試合終了").length;
  if (scheduled == finished) {
    const outfile = `./npb-${data.date}.json`;
    writeFileSync(outfile, output, "utf8");
  }
})();