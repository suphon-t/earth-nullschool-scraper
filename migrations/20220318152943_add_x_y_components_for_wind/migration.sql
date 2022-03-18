/*
  Warnings:

  - Added the required column `windX` to the `DataPoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `windY` to the `DataPoint` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataPoint" (
    "datetime" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "lat" DECIMAL NOT NULL,
    "long" DECIMAL NOT NULL,
    "temp" DECIMAL NOT NULL,
    "windDir" INTEGER NOT NULL,
    "windSpeed" INTEGER NOT NULL,
    "windX" DECIMAL NOT NULL,
    "windY" DECIMAL NOT NULL,

    PRIMARY KEY ("datetime", "location")
);
INSERT INTO "new_DataPoint" ("datetime", "lat", "location", "long", "temp", "windDir", "windSpeed") SELECT "datetime", "lat", "location", "long", "temp", "windDir", "windSpeed" FROM "DataPoint";
DROP TABLE "DataPoint";
ALTER TABLE "new_DataPoint" RENAME TO "DataPoint";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
