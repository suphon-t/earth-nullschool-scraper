# earth-nullscholl-scraper

A simple project to scrape wind and temperature data from [https://earth.nullschool.net](https://earth.nullschool.net).

## Usage

```sh
# Install dependencies
$ yarn

# Download the app source
$ yarn download-app

# Prepare the database
$ yarn migrate

# Start scraping
$ yarn scrape
```

## Project structure

This project consists of 2 part:
- App downloader
- Scraper

## App downloader

[https://earth.nullschool.net](https://earth.nullschool.net) uses a closed source data format (`.epak`), which doesn't have a parser library publicly available. However, there is a source map available on the website that contains a large part of the source code.

The app downloader downloads the source map, extract it, and then patch it to work on our Node.js environment.

## Scraper

This part downloads the epak data for each 3h interval, and calls the parsing functions inside the app source to parse the data. The parsed data is then stored in SQLite database for later queries. 

If the scraper is stopped, it will automatically resume from the last successful point on subsequent launch.
