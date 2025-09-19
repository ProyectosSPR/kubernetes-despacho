/** @odoo-module **/

import { registry } from "@web/core/registry";
import { loadJS } from '@web/core/assets';
import { jsonrpc } from "@web/core/network/rpc_service";


async function YodleeFastkLink(env, action) {
    await loadJS("https://cdn.yodlee.com/fastlink/v4/initialize.js");
    launchFastLink(action.params)
}

async function launchFastLink(creds) {
    // Generate dynamic overlay element for Fastlink.
    
    const overlayElement = document.createElement("div");
    overlayElement.id = "yodlee-overlay";
    overlayElement.className = "position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex justify-content-center align-items-center";
    overlayElement.style.zIndex = "1050";
    const contentContainer = document.createElement("div");
    contentContainer.id = "overlay-content";
    contentContainer.className = "p-3 position-relative";
    contentContainer.style.width = "80%";
    contentContainer.style.height = "80%";
    contentContainer.style.overflowY = "auto";
    overlayElement.appendChild(contentContainer);
    document.body.appendChild(overlayElement);

    try {
        // Launching Fastlink

        window.fastlink.open({
            fastLinkURL: creds.fastlink_url,
            accessToken: `Bearer ${creds.access_token}`,
            params: {
                configName: 'Aggregation'
            },
            onSuccess: async function (data) {
                console.log(data, "success data 96");
            },
            onError: function (error) {
                console.log(error, "error 66")
                removeOverlay();
                if(error.message){
                    alert(error.message);
                }
                else if(error.reason){
                    alert(error.reason);
                }
            },
            onClose: function (data) {
                for(let i = 0; i < data.sites.length; i++){
                    if(data.sites[i].status == "SUCCESS"){
                        connectAccounts(data.sites[i]);
                    }
                }
                removeOverlay();
                console.log(data, "close data");
                window.fastlink.close();
            },
            onEvent: function (data) {
                console.log(data, "event data");
            }
        }, 'overlay-content');
    } catch (e) {
        removeOverlay();
        console.log(e, "error 105");
        alert(e.message)
    }

    function removeOverlay() {
        if (overlayElement) {
            overlayElement.remove();
        }
    }

    async function connectAccounts(data) {
        // Calls the controller to fetch accounts using fetched requestId and providerAccountId

        const url = `${window.location.origin}/api/yodlee/accounts`;
        creds.requestId = data.requestId;
        creds.providerAccountId = data.providerAccountId;
        try {
            const response = await jsonrpc(url, creds);
            // const response = await rpc(url, creds);
            if (response.success === true) {
                console.log("Account fetch successful");
                location.reload();
            } else {
                alert(response.message || "Something went wrong!");
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
            alert("An error occurred while connecting accounts.");
        }
    }
}

registry.category("actions").add("yodlee_fastlink", YodleeFastkLink);
