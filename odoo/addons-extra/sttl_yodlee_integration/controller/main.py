# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
import requests
import json


class YodleeController(http.Controller):
    @http.route('/api/yodlee/accounts', auth='user', website=False, type="json", methods=['POST'], csrf=False)
    def get_yodlee_accounts(self, **kw):
        """
            Fetches the accounts using the given `requestId`, `providerAccountId` returned from the Fastlink and other given credentials.
        """
        creds = json.loads(request.httprequest.data).get("params")
        url = f"{creds.get('api_endpoint')}/accounts"

        params = {
            'requestId': creds.get("requestId"),
            'providerAccountId': creds.get("providerAccountId")
        }
        headers = {
            'Authorization': f'Bearer {creds.get("access_token")}',
            'Api-Version': '1.1'
        }
        try:
            response = requests.request("GET", url, headers=headers, params=params)
            
            if response.ok:
                record_list = []
                json_data = response.json()
                for account in json_data.get("account", []):
                    balance = account.get("balance", {}).get("amount", 0) or account.get("remainingBalance", {}).get("amount", 0)
                    record_dict = {
                        "name": account.get("accountName"),
                        "account_id": account.get("id"),
                        "account_number": account.get("accountNumber"),
                        "account_type": account.get("accountType"),
                        "provider_name": account.get("providerName"),
                        "balance": balance,
                        "bank_id": creds.get("active_id"),
                        "currency_id": request.env.company.currency_id.id
                    }
                    record_list.append(record_dict)
                
                if record_list:
                    request.env['yodlee.account'].create(record_list)
                    bank_id = request.env['yodlee.bank'].search([("id", "=", creds.get("active_id"))])
                    if bank_id:
                        bank_id.status = "connected"

                return {"success": True}
            
            return {"success": False, "message": response.text}
        except Exception as e:
            return {"success": False, "message": str(e)}
