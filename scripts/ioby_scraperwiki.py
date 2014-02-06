#!/usr/bin/env python

import json
import lxml.html
import scraperwiki

# Scrape the project list page
html = scraperwiki.scrape("http://ioby.org/projects?phrase=&status=All&vols=All&sort_by=title&sort_order=ASC&items_per_page=All")
root = lxml.html.fromstring(html)

for project in root.cssselect(".project-miniview"):
    # Get the id
    id = int(project.attrib.get("id").replace("node-", ""))

    # Get the main information in the project summary
    main_info = project.cssselect(".main-info")[0]

    # Get the project name
    project_name = main_info.cssselect("h3")[0].text_content()

    print "%d: %s" % (id, project_name, )

    # Get the url
    url = main_info.cssselect("h3 a")[0].attrib.get("href")

    # Get the extra information in the project summary
    extra_info = project.cssselect(".extra-info .project-info")

    # Total dollars needed
    total_needed = extra_info[2].text_content()
    total_needed = int(total_needed.replace(",", "").replace("$", ""))

    # Total dollars raised
    raised = extra_info[3].text_content()
    raised = int(raised.replace(",", "").replace("$", ""))

    # Needs volunteers if this label is present
    needs_volunteers = False
    if len(project.cssselect(".volunteers")) == 1:
        needs_volunteers = True

    project_url = "http://ioby.org" + url

    # Go get the project page to grab geo info
    subpage = scraperwiki.scrape(project_url)

    # This is a giant JSON blob of data, as a string
    start = subpage.find("jQuery.extend(Drupal.settings")
    end = subpage.find("\n", start)
    # Clean it up
    line = subpage[start:end]
    line = line.replace('jQuery.extend(Drupal.settings, ', '')[:-2]

    # See if the grabbed jQuery line has location info, if it doesn't, move on
    if line.find("gmap") == -1:
        print "Found a bad line"
        continue

    # Convert the line to json and get the location info
    bigjson = json.loads(line)
    project_lat = float(bigjson["gmap"]["project-map"]["markers"][0]["latitude"])
    project_lon = float(bigjson["gmap"]["project-map"]["markers"][0]["longitude"])

    data = {
      'id': id,
      'project': project_name,
      'url': project_url,
      'total_needed': total_needed,
      'raised': raised,
      'needs_volunteers': needs_volunteers,
      'latitude': project_lat,
      'longitude': project_lon,
    }

    scraperwiki.sqlite.save(unique_keys=['id'], data=data)
