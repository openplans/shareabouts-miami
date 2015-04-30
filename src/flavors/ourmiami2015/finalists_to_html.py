#!/usr/bin/env python

import csv

finalists = []
with open('finalists.csv') as csvfile:
    reader = csv.DictReader(csvfile)
    finalists = list(reader)

finalist_p = ("<p><strong>"
              "<a href='/place/{Idea ID}'>{Final Project Title }</a>"
              "</strong> submitted by {Final Submitter Name }.</p>")

for finalist in finalists:
    # import pdb; pdb.set_trace()
    print(finalist_p.format(**finalist))
