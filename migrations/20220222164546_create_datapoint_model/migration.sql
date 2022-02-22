-- CreateTable
CREATE TABLE "DataPoint" (
    "datetime" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "lat" DECIMAL NOT NULL,
    "long" DECIMAL NOT NULL,
    "temp" DECIMAL NOT NULL,
    "windDir" INTEGER NOT NULL,
    "windSpeed" INTEGER NOT NULL,

    PRIMARY KEY ("datetime", "location")
);
