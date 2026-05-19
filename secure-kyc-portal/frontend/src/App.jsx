import { useState } from "react";
import "./App.css";

function App() {

  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    aadhaar: "",
  });

  const [status, setStatus] =
    useState("");

  const [ciphertext, setCiphertext] =
    useState("");

  const [maskedAadhaar, setMaskedAadhaar] =
    useState("");

  const [authority1, setAuthority1] =
    useState(false);

  const [authority2, setAuthority2] =
    useState(false);

  const [authority3, setAuthority3] =
    useState(false);

  const [decryptedData, setDecryptedData] =
    useState(null);

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });

  };

  const encryptData = async () => {

    try {

      setStatus("");

      const response = await fetch(
        "http://localhost:5000/encrypt",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            formData
          ),
        }
      );

      const data =
        await response.json();

      console.log(data);

      if (!response.ok) {

        setStatus(
          data.error ||
          "Encryption Failed"
        );

        return;

      }

      if (
        typeof data.encrypted ===
        "string"
      ) {

        setCiphertext(
          data.encrypted
        );

      }

      if (
        typeof data.maskedAadhaar ===
        "string"
      ) {

        setMaskedAadhaar(
          data.maskedAadhaar
        );

      }

      setAuthority1(false);
      setAuthority2(false);
      setAuthority3(false);

      setDecryptedData(null);

      setStatus(
        "Encryption Successful"
      );

    } catch (err) {

      console.error(err);

      setStatus(
        "Encryption Failed"
      );

    }

  };

  const participateAuthority = (
    authority
  ) => {

    if (authority === 1) {
      setAuthority1(true);
    }

    if (authority === 2) {
      setAuthority2(true);
    }

    if (authority === 3) {
      setAuthority3(true);
    }

  };

  const decryptData = async () => {

    if (
      !authority1 ||
      !authority2 ||
      !authority3
    ) {

      setStatus(
        "All Authorities Must Participate"
      );

      return;

    }

    try {

      const response = await fetch(
        "http://localhost:5000/decrypt",
        {
          method: "POST",
        }
      );

      const data =
        await response.json();

      console.log(data);

      if (!response.ok) {

        setStatus(
          data.error ||
          "Decryption Failed"
        );

        return;

      }

      if (
        typeof data.decrypted ===
        "object"
      ) {

        setDecryptedData(
          data.decrypted
        );

      }

      setStatus(
        "Decryption Successful"
      );

    } catch (err) {

      console.error(err);

      setStatus(
        "Decryption Failed"
      );

    }

  };

  return (

    <div className="container">

      <h1 className="title">
        Privacy-Preserving KYC Sharing System
      </h1>

      <div className="mainGrid">

        <div className="card">

          <h2>
            Applicant Portal
          </h2>

          <input
            type="text"
            name="name"
            placeholder="Full Name"
            onChange={handleChange}
          />

          <input
            type="date"
            name="dob"
            onChange={handleChange}
          />

          <input
            type="text"
            name="aadhaar"
            placeholder="Aadhaar Number"
            onChange={handleChange}
          />

          <button
            onClick={encryptData}
          >
            Encrypt KYC Data
          </button>

          {status && (

            <p className="status">
              {status}
            </p>

          )}

          {maskedAadhaar && (

            <div className="maskedBox">

              <h3>
                Masked Aadhaar
              </h3>

              <p>
                {maskedAadhaar}
              </p>

            </div>

          )}

        </div>

        <div className="card">

          <h2>
            Secure Database
          </h2>

          {ciphertext ? (

            <textarea
              readOnly
              value={ciphertext}
            />

          ) : (

            <p>
              No encrypted payload
            </p>

          )}

        </div>

      </div>

      <div className="authorityGrid">

        <div className="authorityCard">

          <h2>
            Authority 1
          </h2>

          <button
            onClick={() =>
              participateAuthority(1)
            }
          >
            Participate
          </button>

          {authority1 && (

            <p className="success">
              Participated
            </p>

          )}

        </div>

        <div className="authorityCard">

          <h2>
            Authority 2
          </h2>

          <button
            onClick={() =>
              participateAuthority(2)
            }
          >
            Participate
          </button>

          {authority2 && (

            <p className="success">
              Participated
            </p>

          )}

        </div>

        <div className="authorityCard">

          <h2>
            Authority 3
          </h2>

          <button
            onClick={() =>
              participateAuthority(3)
            }
          >
            Participate
          </button>

          {authority3 && (

            <p className="success">
              Participated
            </p>

          )}

        </div>

      </div>

      <div className="decryptSection">

        <button
          className="decryptBtn"
          onClick={decryptData}
        >
          Perform Secure Decryption
        </button>

      </div>

      {decryptedData && (

        <div className="resultCard">

          <h2>
            Decrypted KYC Data
          </h2>

          <p>
            <strong>Name:</strong>
            {" "}
            {decryptedData.name}
          </p>

          <p>
            <strong>DOB:</strong>
            {" "}
            {decryptedData.dob}
          </p>

          <p>
            <strong>Aadhaar:</strong>
            {" "}
            {decryptedData.aadhaar}
          </p>

        </div>

      )}

    </div>

  );

}

export default App;