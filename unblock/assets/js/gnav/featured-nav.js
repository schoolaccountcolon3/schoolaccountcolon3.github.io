/* -----------------------------------------------
/* Authors: QuiteAFancyEmerald and OlyB
/* MIT license: http://opensource.org/licenses/MIT
/* HTML5 gnav
/* ----------------------------------------------- */

var h5gms = [
	{ name: "GeForce NOW", custom: "geforce", img: "geforcenow.png", description: "Play games on the cloud via Steam. Make sure you have an account made for this to verify!" },
	{ name: "A Dark Room", path: "adarkroom/", img: "darkroom.png", description: "A player lights a fire in a dark room. Fun game :D" },
	{ name: "Minecraft: Bedrock Edition", custom: "mcnow", img: "mcnow.jpg", description: "A trial version of the real Minecraft: Bedrock Edition. Pure credits to now.gg for this.", credits: "nowgg" },
	{ name: "Roblox", custom: "roblox", img: "roblox.jpg", description: "Why... well its here now enjoy." },
	{ name: "FNAF", custom: "fnaf", img: "fnaf.png", description: "The classic horror game now on the web!" },
	{ name: "slither.io", custom: "slither", img: "slitherio.jpg", description: "TThe smash-hit game! Play with millions of players around the world and try to become the longest of the day!" },
	{ name: "osu!", custom: "osu", img: "os1.png", description: "Rhythm is just a *click* away! If you experience any input lag be sure to read over the osu! FAQ page." },
	{ name: "Slope", path: "slope/", img: "slope.jpg", description: "Slope game is a fantastic speed run game where you can drive a ball rolling on tons of slopes and obstacles. See how far you can go in this endless course." },
	{ name: "vex 3", path: "vex3/", img: "vex3.png", description: "vex 3 is a fascinating game. Your task is to Take Vex through the levels by running, jumping, sliding and swimming while avoiding dangerous obstacles." },
	{ name: "vex 4", path: "vex4/", img: "vex4.png", description: "VEX 4 takes Vex to the next level! This fast paced stickman game puts your skills to the test. Run, jump, slide, swim and avoid obstacles, VEX 4 has it all." },
	{ name: "vex 5", path: "vex5/", img: "vex5.png", description: "Now, you can meet cute Stickman again in Vex 5. Vex 5 is the 5th platform game in the Vex series. Each level is a labyrinth of deadly devices and traps." },
	{ name: "PUBG MOBILE: Arcane", custom: "pubg", img: "pubg.jpg", description: "Battle royale game thing.", credits: "nowgg" },
	{ name: "Gacha Life", custom: "glife", img: "gachalife.png", description: "Handcraft your very own anime-inspired stories in Gacha Life by Lunime. Wholesome game? Oh no.", credits: "nowgg" },
	{ name: "Among Us", custom: "amongus", img: "amongus.jpg", description: "Why must you do this.", credits: "nowgg" },
	{ name: "Fireboy and Watergirl", path: "firewater/", img: "firewater.png", description: "Fireboy and Watergirl is the first cooperative platformer game in the Fireboy and Watergirl series." },
	{ name: "Friendly Fire", path: "friendlyfire/", img: "friendlyfire.jpg", description: "What dark secrets does this twisted world hold?" },
	{ name: "Duck Life", path: "ducklife/", img: "ducklife.png", description: "The future of the farm is in your hands! Train your duck to run, fly and swim its way to victory so you can save the farm with your riches." },
	{ name: "Duck Life 2", path: "ducklife2/", img: "ducklife2.png", description: "Become a world champion in the successor to Duck Life!" },
	{ name: "Duck Life 3", path: "ducklife3/", img: "ducklife3.png", description: "The third game in the Duck Life series!" },
	{ name: "Duck Life 4", path: "ducklife4/", img: "ducklife4.png", description: "Super scary... yeah the fourth game. What even happened?" },
	{ name: "Google Snake", custom: "gsnake", img: "gsnake.jpg", description: "Eat the apples in this classic retro game. But don't hit the wall, or eat your own tail! How long can you survive?" }
];

var glist = document.getElementById("glist");

for (let item of h5gms) {
	let a = document.createElement("a");
	a.href = "#";
	var img = document.createElement("img");
	img.src = "/assets/img/h5g/" + item.img;
	a.appendChild(img);
	var title = document.createElement("h3");
	title.textContent = item.name;
	a.appendChild(title);
	var desc = document.createElement("p");
	desc.textContent = item.description;
	if (item.credits == "itch") desc.innerHTML += '<br>Credits: Game can be found <a target="_blank" href="https://itch.io">here</a>.';
	if (item.credits == "nowgg") desc.innerHTML += '<br>Credits: Game can be found <a target="_blank" href="https://now.gg">here</a>.';
	a.appendChild(desc);
	a.onclick = function(e) {
		if (e.target == a || e.target.tagName != "A") {
			e.preventDefault();
			item.custom ? goProx[item.custom](true) : goFrame("/archive/g/" + item.path, item.nolag);
		}
	}

	glist.appendChild(a);
}