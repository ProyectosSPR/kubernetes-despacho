# -*- coding: utf-8 -*-

{
    "name": "Odoo Yodlee Integration",
    "version": "17.0.1.0",
    "author": "Silver Touch Technologies Limited",
    "category": "accounting",
    "website": "https://www.silvertouch.com/",
    "description": """
        This module provides functionality to integrate Yodlee with Odoo.
    """,
    "summary": """
        This module provides functionality to integrate Yodlee with Odoo.
    """,
    "depends": ["account", "web", "base_accounting_kit"],
    "data": [
        "security/ir.model.access.csv",
        "views/res_config.xml",
        "views/account_bank_statement.xml",
        "views/invoicing_menu.xml",
        "views/yodlee_bank.xml",
        "wizard/yodlee_transaction_wizard.xml",
    ],
    "assets": {
        "web.assets_backend": [
            'sttl_yodlee_integration/static/src/js/fastlink.js',
        ],
    },
    'uninstall_hook': 'uninstall_hook',
    "price": 0,
    "currency": "USD",
    "license": "LGPL-3",
    "installable": True,
    "application": False,
    "images": ["static/description/banner.png"]
}
