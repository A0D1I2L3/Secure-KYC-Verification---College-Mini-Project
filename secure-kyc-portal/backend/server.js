const express = require("express");
const cors = require("cors");
const path = require("path");

const kyc = require("../kyc-encrypt");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

const KEYS_DIR = path.join(
  __dirname,
  "keys"
);

let encryptedPayload = null;

// Generate authority keys
async function initializeAuthorities() {

  try {

    await kyc.generateAuthorities(
      3,
      {
        authoritiesDir:
          KEYS_DIR,
        overwrite: false,
      }
    );

    console.log(
      "Authorities generated"
    );

  } catch (err) {

    console.error(err);

  }

}

initializeAuthorities();


// ENCRYPT ROUTE
app.post(
  "/encrypt",
  async (req, res) => {

    try {

      const {
        name,
        dob,
        aadhaar,
      } = req.body;

      // Aadhaar validation
      const valid =
        kyc.validateAadhaarFormat(
          aadhaar
        );

      if (!valid) {

        return res
          .status(400)
          .json({
            error:
              "Invalid Aadhaar Number",
          });

      }

      const payload = {
        name,
        dob,
        aadhaar,
      };

      // REAL encryption
      const encrypted =
        await kyc.encrypt(
          payload,
          {
            authoritiesDir:
              KEYS_DIR,
            count: 3,
          }
        );

      encryptedPayload =
        encrypted;

      res.json({
        success: true,

        encrypted,

        maskedAadhaar:
          kyc.maskAadhaar(
            aadhaar
          ),
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        error: err.message,
      });

    }

  }
);


// DECRYPT ROUTE
app.post(
  "/decrypt",
  async (req, res) => {

    try {

      if (
        !encryptedPayload
      ) {

        return res
          .status(400)
          .json({
            error:
              "No encrypted payload available",
          });

      }

      // REAL decryption
      const decrypted =
        await kyc.decrypt(
          encryptedPayload,
          {
            authoritiesDir:
              KEYS_DIR,
            count: 3,
          }
        );

      res.json({
        success: true,
        decrypted,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        error: err.message,
      });

    }

  }
);


// SERVER START
app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});