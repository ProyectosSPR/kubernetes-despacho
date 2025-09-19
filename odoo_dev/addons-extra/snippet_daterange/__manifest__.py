{
    'name': 'Snippet Date Range',
    'description': 'Input element with a Date Range calendar to be used in Odoo Website Builder',
    'category': 'Website/Website',
    'version': '1.0',
    'author': 'Ubbels.com',
    'company': 'Ubbels.com',
    'website': 'www.ubbels.com/snippets',
    'depends': ['website'],
    'data': [
        'views/snippets/s_daterange.xml',
        'views/snippets/s_website_form.xml',
    ],
    'images': ['static/description/app_banner.png'],
    'assets': {
        'web.assets_frontend': [
            '/snippet_daterange/static/src/scss/daterange.scss',
            '/snippet_daterange/static/src/js/daterange.js'
        ],
        'website.assets_wysiwyg': [
            'snippet_daterange/static/src/xml/website_form_editor.xml',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
