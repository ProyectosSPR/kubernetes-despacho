# -*- coding: utf-8 -*-

{
    'name': 'Online appointment',
    'version': '17.0.1.3',
    'author': 'Ubbels.com',
    'price': 0.0,
    'currency': 'EUR',
    'maintainer': 'Ubbels.com',
    'support': 'info@ubbels.com',
    'images': ['static/description/app_logo.jpg'],
    'license': 'OPL-1',
    'website': 'https://www.ubbels.com',
    'category':  'Website',
    'summary': 'Let visitors book an appointment over the website',
    'description':
        """Visitors can book appointments over the website. A calendar pops up, the days marked green are available for selection.
        After selecting a date the visitor needs to choose a timeslot and a appointment option. In the backend you define per
        user his available timeslots. Only timeslots are selectable by the visitor when no other "calendar.event" is present for that period of time.
        Appointment options you define globally in the backend and have a duration. This way a "calendar.event" is created with the correct start and stop.
        
        website appointment
        online appointment
        portal appointment
        appointment
        website meeting
        online meeting
        portal meeting
        meeting
         
        """,
    'depends': [
        'calendar',
        'website',
        'portal'
    ],
    'data': [
        'security/ir.model.access.csv',
        'views/appointment_template.xml',
        'views/appointment_portal_template.xml',
        'views/menus.xml',
        'views/appointment_slot_view.xml',
        'views/appointment_option_view.xml',
        'views/s_daterange.xml',
    ],
    'qweb': [
    ],
    'assets': {
        'web.assets_frontend': [
            '/s2u_online_appointment/static/src/scss/daterange.scss',
            '/s2u_online_appointment/static/src/js/daterange.js',
            '/s2u_online_appointment/static/src/js/main.js',
        ]
    },
    'installable': True,
    'auto_install': False,
}

