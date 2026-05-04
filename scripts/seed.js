const hre = require("hardhat");

async function main() {
  const [owner, alice, bob, charlie] = await hre.ethers.getSigners();
  const deployment = require("../deployment.json");
  const FindChain = await hre.ethers.getContractFactory("FindChain");
  const contract = FindChain.attach(deployment.findChain);

  console.log("\n  Seeding FindChain with realistic data...\n");

  // Register users
  for (const [name, signer] of [["Alice", alice], ["Bob", bob], ["Charlie", charlie]]) {
    await (await contract.connect(signer).registerUser()).wait();
    console.log(`  Registered ${name} (${signer.address.slice(0, 8)}...)`);
  }

  // Lost items
  const lostItems = [
    { signer: alice, title: "iPhone 15 Pro Max", desc: "Space Black, cracked screen protector, blue Spigen case, has personal photos", cat: "electronics", loc: "Bennett University Library", lat: 28451000, lng: 77584000, reward: "0.3" },
    { signer: alice, title: "Dell Laptop Backpack", desc: "Black Dell Pro backpack with laptop, charger, notebook inside. Has a red keychain on zipper", cat: "bags", loc: "Pari Chowk Metro Station", lat: 28467500, lng: 77504000, reward: "0.15" },
    { signer: bob, title: "Car Keys — Hyundai Creta", desc: "Hyundai Creta key fob with 2 house keys and gym membership card attached", cat: "keys", loc: "Alpha 1 Commercial Market", lat: 28474500, lng: 77504000, reward: "0.1" },
    { signer: alice, title: "Gold Chain Necklace", desc: "22 karat gold chain, about 20 grams, box chain style, no pendant", cat: "jewelry", loc: "GIP Mall Noida, Food Court", lat: 28567200, lng: 77321800, reward: "0.5" },
    { signer: charlie, title: "Indian Passport", desc: "Blue cover Indian passport, name starts with R, expires 2028", cat: "documents", loc: "IGI Airport Terminal 3", lat: 28556200, lng: 77100000, reward: "0.2" },
    { signer: bob, title: "Apple Watch Ultra 2", desc: "Titanium Apple Watch Ultra 2 with orange Alpine loop band, has health data", cat: "wearables", loc: "Noida Stadium Running Track", lat: 28575000, lng: 77339000, reward: "0.25" },
    { signer: charlie, title: "German Shepherd — Rocky", desc: "Male German Shepherd, 2 years old, black and tan, blue collar, very friendly, responds to Rocky", cat: "pets", loc: "Surajpur Wetlands, Greater Noida", lat: 28487000, lng: 77523000, reward: "0.4" },
    { signer: alice, title: "Prescription Glasses", desc: "Ray-Ban rectangular frame, power -3.5 both eyes, black frame with gold hinges", cat: "medical", loc: "Bennett University Cafeteria", lat: 28450800, lng: 77583500, reward: "0.05" },
  ];

  for (const item of lostItems) {
    const ipfsImg = "Qm" + [...Array(44)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
    const ipfsMeta = "Qm" + [...Array(44)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
    await (await contract.connect(item.signer).reportLostItem(
      item.title, item.desc, item.cat, ipfsImg, ipfsMeta, item.loc, item.lat, item.lng,
      { value: hre.ethers.parseEther(item.reward) }
    )).wait();
    console.log(`  LOST: ${item.title} (${item.reward} ETH reward)`);
  }

  // Found items (some match lost items by category)
  const foundItems = [
    { signer: bob, title: "Black Smartphone with Blue Case", desc: "Found black iPhone near library entrance, has blue Spigen case, screen protector cracked", cat: "electronics", loc: "Bennett University Gate 2", lat: 28451200, lng: 77583800 },
    { signer: charlie, title: "Black Backpack with Red Keychain", desc: "Found black Dell branded backpack at metro platform, red keychain on front zipper, has laptop inside", cat: "bags", loc: "Knowledge Park II Metro", lat: 28472000, lng: 77510000 },
    { signer: alice, title: "Hyundai Car Key Fob", desc: "Found Hyundai key fob with house keys near parking lot, gym card attached", cat: "keys", loc: "Alpha 2 Parking, Greater Noida", lat: 28475000, lng: 77505000 },
    { signer: bob, title: "Gold Chain Found on Floor", desc: "22k gold chain found on food court floor, box chain, no pendant, approximately 20g", cat: "jewelry", loc: "GIP Mall, Sector 38A Noida", lat: 28567500, lng: 77322000 },
    { signer: charlie, title: "Blue Passport Found at Check-in", desc: "Indian passport blue cover found near Air India counter, name starts with R", cat: "documents", loc: "IGI Airport Terminal 3, Counter 14", lat: 28556500, lng: 77100500 },
    { signer: bob, title: "Smartwatch with Orange Band", desc: "Found titanium smartwatch with bright orange band near running track bleachers", cat: "wearables", loc: "Noida Stadium Gate 3", lat: 28575200, lng: 77339500 },
  ];

  for (const item of foundItems) {
    const ipfsImg = "Qm" + [...Array(44)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
    const ipfsMeta = "Qm" + [...Array(44)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
    await (await contract.connect(item.signer).reportFoundItem(
      item.title, item.desc, item.cat, ipfsImg, ipfsMeta, item.loc, item.lat, item.lng
    )).wait();
    console.log(`  FOUND: ${item.title}`);
  }

  // Auto-match: pair lost and found by category
  const totalItems = Number(await contract.nextItemId());
  const items = [];
  for (let i = 1; i < totalItems; i++) {
    const item = await contract.getItem(i);
    items.push({ id: i, type: Number(item.itemType), category: item.category, status: Number(item.status), reporter: item.reporter });
  }

  const lostActive = items.filter(i => i.type === 0 && i.status === 0);
  const foundActive = items.filter(i => i.type === 1 && i.status === 0);
  let matchCount = 0;

  for (const lost of lostActive) {
    for (const found of foundActive) {
      if (lost.category === found.category && found.status === 0) {
        const score = 7500 + Math.floor(Math.random() * 2000);
        // Use the found item reporter to propose (any registered user can now)
        const proposer = [alice, bob, charlie].find(s => s.address === found.reporter) || bob;
        try {
          await (await contract.connect(proposer).proposeMatch(lost.id, found.id, score)).wait();
          console.log(`  MATCH: Item #${lost.id} <-> #${found.id} (${score/100}% score)`);
          matchCount++;
          found.status = 1; // mark as matched locally
        } catch (e) {
          // skip if already matched
        }
        break; // one match per lost item
      }
    }
  }

  // Confirm 2 matches (alice confirms her items)
  const totalMatches = Number(await contract.nextMatchId());
  let confirmed = 0;
  for (let i = 1; i < totalMatches && confirmed < 2; i++) {
    const m = await contract.getMatch(i);
    if (!m.confirmed && !m.disputed) {
      try {
        await (await contract.connect(alice).confirmMatch(i)).wait();
        console.log(`  CONFIRMED: Match #${i} — reward released!`);
        confirmed++;
      } catch {
        // not alice's item, skip
      }
    }
  }

  console.log(`\n  Done! ${lostItems.length} lost, ${foundItems.length} found, ${matchCount} matches, ${confirmed} confirmed`);
  console.log("  Open http://localhost:3000 and connect wallet to see data\n");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
