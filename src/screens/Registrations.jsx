import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./Registrations.css";
import { db } from "../firebase";
import { useLocation, useNavigate } from "react-router-dom";
import Loader from "../components/Loader";

const Registrations = ({ isLoggedIn }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const eventId = location.state?.eventId;
  const [formFields, setFormFields] = useState([]);
  const [teamConfig, setTeamConfig] = useState(null);
  const [teamSize, setTeamSize] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormFields(data.formFields || []);
          setTeamConfig(data.teamConfig || null);
        } else {
          console.log("No such document!");
          setFormFields([]);
        }
      } catch (error) {
        console.error("Error fetching event data: ", error);
      }
      setIsLoading(false);
    };

    fetchEventData();
  }, [eventId]);

  const handleEdit = () => {
    if (eventId) {
      navigate("/regform", { state: { eventId: eventId } });
    } else {
      console.error("Event ID is not available.");
    }
  };

  const handleTeamSizeChange = (e) => {
    const size = parseInt(e.target.value, 10);

    // Check if size is a valid number and within the allowed range
    if (isNaN(size) || size < 0 || size > (teamConfig?.teamSize || Infinity)) {
      setErrorMessage(
        `Team size must be a number between 0 and ${teamConfig?.teamSize || 0}`
      );
      return;
    }

    setErrorMessage(""); // Clear error if input is valid
    setTeamSize(size);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const submittedData = {};

    // Collect individual form field data
    formFields.forEach((field, index) => {
      if (field.type === "checkbox") {
        const checkboxes = formData.getAll(`field-${index}`);
        submittedData[field.label] = checkboxes;
      } else {
        submittedData[field.label] = formData.get(`field-${index}`);
      }
    });

    // Collect team data if teamConfig is enabled
    if (teamConfig) {
      const teamData = {
        teamSize,
        members: [],
      };

      for (let i = 0; i < teamSize; i++) {
        const memberData = {};
        teamConfig.memberDetails.forEach((detail, detailIndex) => {
          if (detail.type === "checkbox") {
            const checkboxes = formData.getAll(
              `team-${i}-detail-${detailIndex}`
            );
            memberData[detail.label] = checkboxes;
          } else {
            memberData[detail.label] = formData.get(
              `team-${i}-detail-${detailIndex}`
            );
          }
        });
        teamData.members.push(memberData);
      }
      submittedData.teamData = teamData;
    }

    try {
      const registrationsRef = doc(
        db,
        "events",
        eventId,
        "registrations",
        Date.now().toString()
      );

      await setDoc(registrationsRef, submittedData);
      console.log("Registration successful:", eventId, submittedData);
      alert("Registration is Successful");
      navigate("/");
    } catch (error) {
      console.error("Error saving registration:", error);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  // Ensure teamSize is a valid number
  const validTeamSize =
    Number.isInteger(teamSize) &&
    teamSize >= 0 &&
    teamSize <= (teamConfig?.teamSize || Infinity)
      ? teamSize
      : 0;

  return (
    <form className="register-event-form" onSubmit={handleSubmit}>
      <div className="events-header">
        <h1 className="events-heading">Events</h1>
        {isLoggedIn && (
          <button
            className="add-event"
            style={{ width: "10%", fontSize: 16 }}
            onClick={handleEdit}
          >
            Edit
          </button>
        )}
      </div>

      {errorMessage && <p className="error">{errorMessage}</p>}

      {/* Render individual form fields */}
      {formFields.map((field, index) => (
        <div key={index} className="form-group">
          <label>
            {field.label}
            {field.required && <span>*</span>}
          </label>
          {field.type === "text" || field.type === "email" ? (
            <input
              type={field.type}
              placeholder={field.label}
              name={`field-${index}`}
              required={field.required}
            />
          ) : field.type === "checkbox" ? (
            <div>
              {field.options.map((option, idx) => (
                <label
                  key={idx}
                  className="checkbox-option"
                  style={{ color: "#fff", fontSize: "14.9px" }} // Inline CSS for white color and 14.9px font size
                >
                  <input
                    type="checkbox"
                    name={`field-${index}`}
                    value={option}
                  />
                  {option}
                </label>
              ))}
            </div>
          ) : field.type === "radio" ? (
            <div>
              {field.options.map((option, idx) => (
                <label
                  key={idx}
                  className="radio-option"
                  style={{ color: "#fff", fontSize: "14.9px" }} // Inline CSS for white color and 14.9px font size
                >
                  <input
                    type="radio"
                    name={`field-${index}`}
                    value={option}
                    required={field.required}
                  />
                  {option}
                </label>
              ))}
            </div>
          ) : field.type === "select" ? (
            <select name={`field-${index}`} required={field.required}>
              {field.options.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ))}

      {/* Render team configuration */}
      {teamConfig && (
        <div className="team-config-container">
          <h3>Team Details</h3>
          <div className="form-group">
            <label>
              Team Size (Max: {teamConfig?.teamSize || "N/A"}) <span>*</span>
            </label>
            <input
              type="number"
              min="0"
              max={teamConfig?.teamSize || "N/A"}
              placeholder={`Enter team size (max: ${
                teamConfig?.teamSize || 0
              })`}
              value={validTeamSize}
              onChange={handleTeamSizeChange}
              required
            />
          </div>

          {/* Render team members only if teamSize is valid */}
          {validTeamSize > 0 &&
            validTeamSize <= (teamConfig?.teamSize || Infinity) &&
            [...Array(validTeamSize)].map((_, teamIndex) => (
              <div key={teamIndex} className="team-member-container">
                <h4>Member {teamIndex + 1}</h4>
                {teamConfig.memberDetails.map((detail, detailIndex) => (
                  <div key={detailIndex} className="form-group">
                    <label style={{ fontSize: 18 }}>
                      {detail.label}

                      {detail.required && <span>*</span>}
                    </label>
                    {detail.type === "text" || detail.type === "email" ? (
                      <input
                        type={detail.type}
                        placeholder={detail.label}
                        name={`team-${teamIndex}-detail-${detailIndex}`}
                        required={detail.required}
                      />
                    ) : detail.type === "checkbox" ? (
                      <div>
                        {detail.options.map((option, idx) => (
                          <label
                            key={idx}
                            style={{ color: "#fff", fontSize: "14.9px" }} // Inline CSS for white color and 14.9px font size
                            className="checkbox-option"
                          >
                            <input
                              type="checkbox"
                              name={`team-${teamIndex}-detail-${detailIndex}`}
                              value={option}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    ) : detail.type === "radio" ? (
                      <div>
                        {detail.options.map((option, idx) => (
                          <label
                            key={idx}
                            style={{ color: "#fff", fontSize: "14.9px" }} // Inline CSS for white color and 14.9px font size
                            className="radio-option"
                          >
                            <input
                              type="radio"
                              name={`team-${teamIndex}-detail-${detailIndex}`}
                              value={option}
                              required={detail.required}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      <button type="submit" className="submit-button">
        Submit
      </button>
    </form>
  );
};

export default Registrations;
