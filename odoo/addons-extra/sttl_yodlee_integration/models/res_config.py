# -*- coding: utf-8 -*-

from odoo import models, fields


class ResConfigInherit(models.TransientModel):
    _inherit = "res.config.settings"

    yodlee_client_id = fields.Char(string="Client Id", 
                    config_parameter="sttl_yodlee_integration.yodlee_client_id")
    yodlee_api_secret = fields.Char(string="Secret",
                                   config_parameter="sttl_yodlee_integration.yodlee_api_secret")
    yodlee_api_endpoint = fields.Char(string="API Endpoint",
                                         config_parameter="sttl_yodlee_integration.yodlee_api_endpoint")
    yodlee_fastlink_url = fields.Char(string="FastLink URL",
                                         config_parameter="sttl_yodlee_integration.yodlee_fastlink_url")
