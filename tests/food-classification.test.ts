import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LiveQlooAdapter } from "../lib/qloo/live.ts";

describe("Food vs Place Classification Suite", () => {
  // Real CN Tower entity from live Qloo response (has incidental 'Restaurant' tag due to 360 Restaurant)
  const cnTowerEntity = {
    entity_id: "PLACE_CN_TOWER",
    name: "CN Tower",
    properties: {
      primary_genre: { name: "Television tower" },
      short_description: "Iconic communications and observation tower in Downtown Toronto.",
      address: "290 Bremner Blvd, Toronto, ON M5V 3L9",
    },
    tags: [
      { name: "Tourist attraction" },
      { name: "Observation deck" },
      { name: "Restaurant" }, // Incidental tag that caused the bug
      { name: "Panoramic view" },
      { name: "High speed elevators" },
    ],
  };

  const cnTowerTouristAttraction = {
    entity_id: "PLACE_CN_TOWER_2",
    name: "The Top CN Tower",
    properties: {
      primary_genre: { name: "Observation deck" },
    },
    tags: [{ name: "Tourist attraction" }, { name: "Sightseeing" }],
  };

  const museumEntity = {
    entity_id: "PLACE_MOCA",
    name: "Museum of Contemporary Art Toronto Canada",
    properties: {
      primary_genre: { name: "Art museum" },
    },
    tags: [
      { name: "Art museum" },
      { name: "Contemporary art" },
      { name: "Cafe" }, // Museum cafe tag
      { name: "Public restrooms" },
    ],
  };

  const collegeEntity = {
    entity_id: "PLACE_ST_MICHAELS",
    name: "University of St. Michael's College",
    properties: {
      primary_genre: { name: "College" },
    },
    tags: [{ name: "Academic research" }, { name: "Theology" }],
  };

  const gooderhamEntity = {
    entity_id: "PLACE_GOODERHAM",
    name: "Gooderham Building",
    properties: {
      primary_genre: { name: "Historical place" },
    },
    tags: [{ name: "Historic landmark" }, { name: "Flatiron architecture" }],
  };

  const cityHallEntity = {
    entity_id: "PLACE_CITY_HALL",
    name: "Toronto City Hall",
    properties: {
      primary_genre: { name: "City Hall" },
    },
    tags: [{ name: "Civic center" }, { name: "Cafeteria" }, { name: "Food trucks" }],
  };

  const airportEntity = {
    entity_id: "PLACE_PEARSON",
    name: "Toronto Pearson International Airport",
    properties: {
      primary_genre: { name: "International airport" },
    },
    tags: [{ name: "Airport" }, { name: "Dining options" }],
  };

  // Real Dining Entities from live Qloo response
  const burwashDining = {
    entity_id: "PLACE_BURWASH",
    name: "Burwash Dining Hall",
    properties: {
      primary_genre: { name: "Restaurant" },
      cuisine_description: "Campus dining hall offering diverse meal options and vegetarian fare.",
    },
    tags: [{ name: "Restaurant" }, { name: "Lunch" }, { name: "Takeout" }],
  };

  const lambrettaPizzeria = {
    entity_id: "PLACE_LAMBRETTA",
    name: "Lambretta Pizzeria",
    properties: {
      primary_genre: { name: "Restaurant" },
      cuisine_description: "Lambretta Pizzeria specializes in authentic Italian pizza.",
    },
    tags: [{ name: "Restaurant" }, { name: "Pizza" }, { name: "New york style pizza" }],
  };

  const izumiBrewery = {
    entity_id: "PLACE_IZUMI",
    name: "IZUMI Brewery (Ontario Spring Water Sake Company)",
    properties: {
      primary_genre: { name: "Sake brewery" },
      cuisine_description: "Artisanal sake brewery in the Distillery Historic District.",
    },
    tags: [{ name: "Brewery" }, { name: "Educational brewing experience" }],
  };

  const parisTexasBar = {
    entity_id: "PLACE_PARIS_TEXAS",
    name: "Paris Texas",
    properties: {
      primary_genre: { name: "Bar" },
      cuisine_description: "Paris Texas offers a contemporary American dining experience and cocktails.",
    },
    tags: [{ name: "Bar" }, { name: "Bar service" }, { name: "Full bar" }],
  };

  const libraryCoffee = {
    entity_id: "PLACE_LIBRARY_COFFEE",
    name: "Library Coffee",
    properties: {
      primary_genre: { name: "Coffee shop" },
      cuisine_description: "Artisanal coffee shop focused on ethically sourced beans and pastries.",
    },
    tags: [{ name: "Coffee shop" }, { name: "Coffee and tea" }],
  };

  test("rejects CN Tower from food category despite incidental restaurant/cafe tags", () => {
    assert.equal(LiveQlooAdapter.isDiningPlace(cnTowerEntity), false);
    assert.equal(LiveQlooAdapter.isDiningPlace(cnTowerTouristAttraction), false);
  });

  test("rejects museums, galleries, colleges, and historic buildings from food", () => {
    assert.equal(LiveQlooAdapter.isDiningPlace(museumEntity), false);
    assert.equal(LiveQlooAdapter.isDiningPlace(collegeEntity), false);
    assert.equal(LiveQlooAdapter.isDiningPlace(gooderhamEntity), false);
    assert.equal(LiveQlooAdapter.isDiningPlace(cityHallEntity), false);
    assert.equal(LiveQlooAdapter.isDiningPlace(airportEntity), false);
  });

  test("correctly classifies genuine restaurants, cafes, pizzerias, bars, and breweries as food", () => {
    assert.equal(LiveQlooAdapter.isDiningPlace(burwashDining), true);
    assert.equal(LiveQlooAdapter.isDiningPlace(lambrettaPizzeria), true);
    assert.equal(LiveQlooAdapter.isDiningPlace(izumiBrewery), true);
    assert.equal(LiveQlooAdapter.isDiningPlace(parisTexasBar), true);
    assert.equal(LiveQlooAdapter.isDiningPlace(libraryCoffee), true);
  });

  test("handles both raw Qloo entity object and wrapped InsightResult entity", () => {
    const wrappedResult = {
      entity: burwashDining,
      rawAffinity: 0.95,
      normalizedFamiliarity: 0.7,
      novelty: 0.3,
    };
    assert.equal(LiveQlooAdapter.isDiningPlace(wrappedResult), true);

    const wrappedNonFood = {
      entity: cnTowerEntity,
      rawAffinity: 0.91,
      normalizedFamiliarity: 0.8,
      novelty: 0.2,
    };
    assert.equal(LiveQlooAdapter.isDiningPlace(wrappedNonFood), false);
  });
});
