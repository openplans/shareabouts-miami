#!/usr/bin/env python

import csv
import json
import requests
import sys

finalists = []
with open('finalists.csv') as csvfile:
    reader = csv.DictReader(csvfile)
    finalists = list(reader)

url_tmp = ('http://shareaboutsapi2.herokuapp.com/api/v2/'
           'ourmiami/datasets/psc2015/places/{Idea ID}')
update = {'type': 'Feature', 'properties': {'ff': '1'}}

username = sys.argv[1]
password = sys.argv[2]

for finalist in finalists:
    url = url_tmp.format(**finalist)
    response = requests.patch(url,
        headers={'Content-type': 'application/json', 'X-Shareabouts-silent': 'true'},
        auth=(username, password),
        data=json.dumps(update))

    if response.status_code != 200:
        print('failed to update {}'.format(url))
        import pdb; pdb.set_trace()
    else:
        print('updated {}'.format(url))