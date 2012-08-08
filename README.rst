oDesk Standalone Widget readme
==============================

This is lightweight clone of the oDesk widget (widget.odeskps.com)
Widget use CSS from original to look like original one.


Original widget works with it's own backend server and when installed on your site
requires some time to cache results before it can display it for visitors.


This widget is pure JavaScript UI for oDesk providers & jobs search API.
It utilize JSONP protocol to send queries to API and to receive response data.
It display search results just after visitor hit enter.


Configuration
=============

Widget supports all params from API:

    http://developers.odesk.com/w/page/12364013/search%20providers
    
    http://developers.odesk.com/w/page/12364013/search%20jobs


Sample widget initialization look like:

    OdeskWidget.init({
	'id': 'odesk-widget',
        'api': 'providers',
        'q': 'python'
    });


Files and samples
=================


Widget itself is 1 file:

    widget/widget.js


Also there are 2 sample files:

    widget/widget.html

    widget/widget_jobs.html


First one is providers widget, second - sample jobs widget.


Requirements
============

 * jQuery 1.7.2
 * jQuery templates 
 * jQuery UI 1.8.18

