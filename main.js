const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const axios = require("axios");
const https = require('https');

const api_end_points = require("./api_end_points");

l_relax_sec = 600;
l_is_process = false;
var myInterval;

// Function to fetch pending data from the database
async function fetchpendingdata() {
  try {
    const getapi = api_end_points.getapi;
    console.log("\n\n🚀 ~ fetchpendingdata ~ getapi:", getapi)

    const customAxios = axios.create({
      baseURL: getapi,
      timeout: 60000, //optional
      httpsAgent: new https.Agent({ keepAlive: true })
    });
    // console.log("\n\n🚀 ~ fetchpendingdata ~ customAxios:", customAxios)

    const response = await customAxios.get();
    console.log("\n\n\n\n🚀 ~ fetchpendingdata ~ response:", response)

    var l_pending_data = await response.data.items;
    console.log("\n\n\n🚀 ~ fetchpendingdata ~ l_pending_data:", l_pending_data)
    return l_pending_data;
  } catch (err) {
    console.log('Error:', err);
  }
}

// Function to update the database with the status of the message
async function updatesmsstatus(phone, id, error_message) {
  try {
    var updateapi;
    if (!error_message) {
      updateapi = api_end_points.updateapi;
      params = {
        status_p: "Y",
        error_message_p: error_message,
        id_p: id,
      };
      const response = await axios.put(updateapi, params);
    } else {
      updateapi = api_end_points.updateapi;
      params = {
        status_p: "E",
        error_message_p: error_message,
        id_p: id,
      };
      const response = await axios.put(updateapi, params);
    }
  } catch (err) {
    console.log(err);
  }
}

///////////////////////////////////////////////////////////////////////////////
async function fetchMediaFromUrl(url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const base64Data = Buffer.from(response.data).toString("base64");
    return base64Data;
  } catch (error) {
    console.error("Error fetching media from URL:", error);
    throw error; // Re-throw the error to handle it elsewhere if needed
  }
}

///////////////////////////////////////////////////////////////////////////////
// Function process start
async function process_start() {
  console.log("Pending SMS loading");
  var pending_sms = await fetchpendingdata();

  // Set l_is_process to true to indicate processing is in progress
  l_is_process = true;

  for (x of pending_sms) {
    if (x.status === "N") {
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      await send_sms(x);
    }

    // Break the loop after processing the first pending message
    //break;
  }

  // Reset l_is_process and clear l_pending_data
  l_is_process = false;

  const date = Date();
  const new_date = new Date(date);
  const hours = new_date.getHours();
  const minutes = new_date.getMinutes();
  const seconds = new_date.getSeconds();
  console.log(
    "Waiting for next process start at: " +
      hours +
      ":" +
      minutes +
      ":" +
      seconds
  );
}

///////////////////////////////////////////////////////////////////////////////
async function send_sms(x) {
  console.log("Sending message to", x.phone);

  try {
    // Send the message asynchronously and wait for it to complete
    /*let client_phone =
      "92" +
      String(x.phone).replace(" ", "").replace("-", "").slice(-10) +
      "@c.us"; */

     // Validate and format the phone number
    let phoneNumber = String(x.phone).replace(/\s|-/g, '').slice(-10);
    if (!/^\d{10}$/.test(phoneNumber)) {
      throw new Error("Invalid phone number format");
    }
    const client_phone = `92${phoneNumber}@c.us`; 
    // const client_phone = `923211063174@c.us`; 


    // Example URL of the media file
    const mediaUrl = x.attachment_link;

    // Get the registered WhatsApp ID for a number
    var verified = await client.isRegisteredUser(client_phone);

    if (verified) {
      //--------------if Media need to send
      if (mediaUrl) {
        fetchMediaFromUrl(mediaUrl)
          .then((mediaData) => {
            // Create a MessageMedia object with the PDF attachment
            const media = new MessageMedia(
              "application/pdf",
              mediaData,
              x.attachment_name
            );

            // Now you can use the created MessageMedia object to send the media file in a message
            client.sendMessage(client_phone, media, { caption: x.sms });
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      } else {
        client.sendMessage(client_phone, x.sms);
      }

      // Update the database status only if the message was sent successfully
      await updatesmsstatus(x.phone, x.seq_num, "");
    } else {
      // Update the database status if the Phone Number is not correct
      await updatesmsstatus(
        x.phone,
        x.seq_num,
        "Mobile no is not registered on Whatsapp"
      );
    }
  } catch (error) {
    // Handle errors that occur while sending the message
    console.error("Error sending message on:"+x.phone);
  }
}
///////////////////////////////////////////////////////////////////////////

function custom_setInterval() {
  try {
    clearInterval(myInterval);
  } catch (err) {
    console.error("Error on custom set interval:", err);
  }

  myInterval = setInterval(function () {
    if (l_is_process == false) {
      if (l_relax_sec >= 600) {
        l_relax_sec = 0;
        process_start();
      } else {
        l_relax_sec++;
      }
    }
  }, 1000);
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "Shafique_Foods" }),
  /*webVersionCache: {
    type: "remote",
    remotePath:
      "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1013322639-alpha.html",
  },  */
});

client.on("ready", () => {
  console.log("Client is ready!");
  // client.sendMessage("923211063174@c.us", "Client is ready!");
 custom_setInterval();
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.initialize();
