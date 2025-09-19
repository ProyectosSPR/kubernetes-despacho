# -*- coding: utf-8 -*-

from odoo import models, fields
import requests
from odoo.exceptions import AccessError, ValidationError


class YodleeBank(models.Model):
    _name = "yodlee.bank"

    name = fields.Char(required=True)
    login_name = fields.Char(string="Login Name", required=True)
    status = fields.Selection(
        [('not_connected', 'Not connected'), ('connected', 'Connected')], default="not_connected")
    account_ids = fields.One2many(
        "yodlee.account", "bank_id", string="Accounts")

    def disconnect_accounts(self):
        """
            Unlink all the accounts of given Bank.
        """
        length = len(self.account_ids) - 1
        while (length >= 0):
            self.account_ids[length].unlink()
            length -= 1
        self.status = "not_connected"
        return {
            "type": "ir.actions.client",
            "tag": "reload",
        }

    def connect_accounts(self):
        """
            Calls client action to launch the Fastlink with credentials.
        """
        client_id = self.env['ir.config_parameter'].sudo().get_param(
            'sttl_yodlee_integration.yodlee_client_id')
        secret = self.env['ir.config_parameter'].sudo().get_param(
            'sttl_yodlee_integration.yodlee_api_secret')
        api_endpoint = self.env['ir.config_parameter'].sudo().get_param(
            'sttl_yodlee_integration.yodlee_api_endpoint')
        fastlink_url = self.env['ir.config_parameter'].sudo().get_param(
            'sttl_yodlee_integration.yodlee_fastlink_url')
        
        if not client_id or not secret or not api_endpoint or not fastlink_url:
            raise ValidationError("Missing yodlee credentials")
        
        access_token = self.get_access_token(api_endpoint, client_id, secret)

        return {
            "type": "ir.actions.client",
            "tag": "yodlee_fastlink",
            "params": {
                "client_id": client_id,
                "secret": secret,
                "api_endpoint": api_endpoint,
                "fastlink_url": fastlink_url,
                "access_token": access_token,
                "active_id": self.id
            }
        }
        
    def get_access_token(self, api_endpoint, client_id, secret):
        """
            Generates access token using the given credentials.
        """
        url = f"{api_endpoint}/auth/token"
        headers = {
            "Api-Version": "1.1",
            "Content-Type": "application/x-www-form-urlencoded",
            "loginName": self.login_name
        }
        data = {
            "clientId": client_id,
            "secret": secret
        }
        try:
            response = requests.post(url, headers=headers, data=data)
            if response.ok:
                result =  response.json()
                if result and result.get("token") and result["token"].get("accessToken"):
                    return result["token"].get("accessToken")
                elif result.get("errorMessage"):
                    raise AccessError(result.get("errorMessage"))
            else:
                raise AccessError(f"{response.status_code} - Unable to establish connection")
        except Exception as e:
            raise ValidationError(str(e))
