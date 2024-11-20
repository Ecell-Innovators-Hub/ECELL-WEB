import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import "./RegistersTable.css";
import Loader from "../components/Loader";
import * as XLSX from "xlsx";
import {
  collection,
  getDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

const RegistersTable = () => {
  const [registrations, setRegistrations] = useState([]);
  const [teamConfig, setTeamConfig] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [submittedTeams, setSubmittedTeams] = useState({});
  const [marksCriteria, setMarksCriteria] = useState([]);
  const [marks, setMarks] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMembers, setExpandedMembers] = useState({});
  const [showCriteriaPopup, setShowCriteriaPopup] = useState(false);
  const [newCriteria, setNewCriteria] = useState({ name: "", totalMarks: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [events, setEvents] = useState([]); // For dropdown event list
  const [selectedEventId, setSelectedEventId] = useState(null); // For selected event

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const eventList = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().eventName || "Unnamed Event",
        }));
        setEvents(eventList);

        if (eventList.length > 0) {
          setSelectedEventId(eventList[0].id); // Default to the first event
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!selectedEventId) return;

      setIsLoading(true);
      try {
        const eventDocRef = doc(db, "events", selectedEventId);
        const eventDoc = await getDoc(eventDocRef);

        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          setTeamConfig(eventData.teamConfig || null);
          setFormFields(eventData.formFields || []);
          setMarksCriteria(eventData.marksCriteria || []);
        }

        const registrationsRef = collection(
          db,
          "events",
          selectedEventId,
          "registrations"
        );
        const querySnapshot = await getDocs(registrationsRef);

        let data = [];
        let submittedTeamsData = {};
        let fetchedMarks = {};

        // Determine the highest existing team ID
        let maxTeamId = 0;

        querySnapshot.docs.map(async (docSnapshot) => {
          const regData = docSnapshot.data();
          const teamId = regData.teamData?.teamId;

          if (teamId) {
            maxTeamId = Math.max(maxTeamId, parseInt(teamId, 10));
          } else {
            // Assign a new team ID if it doesn't exist
            maxTeamId += 1;
            regData.teamData = {
              ...regData.teamData,
              teamId: maxTeamId.toString(),
            };

            // Update the document in Firebase
            const teamDocRef = doc(
              db,
              "events",
              selectedEventId,
              "registrations",
              docSnapshot.id
            );
            await updateDoc(teamDocRef, {
              "teamData.teamId": maxTeamId.toString(),
            });
          }

          data.push({ id: docSnapshot.id, ...regData });

          if (regData.marks) {
            submittedTeamsData[teamId] = true;
            fetchedMarks[teamId] = regData.marks;
          }
        });

        setRegistrations(data);
        setSubmittedTeams(submittedTeamsData);
        setMarks(fetchedMarks); // Store all marks
      } catch (error) {
        console.error("Error fetching event or registration data:", error);
      }
      setIsLoading(false);
    };

    fetchEventDetails();
  }, [selectedEventId]);

  const toggleMemberDetails = (id) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSubmitMarks = async (teamId) => {
    const teamMarks = marks[teamId] || {};
    const totalMarks = calculateTotalMarks(teamId);

    // Format marks, checking for undefined values
    const formattedMarks = marksCriteria.reduce((acc, criteria, index) => {
      let mark = teamMarks[index];

      // If mark is undefined, fetch it from Firebase
      if (mark === undefined) {
        mark = getMarkFromFirebase(teamId, criteria.name);
      }

      acc[criteria.name] = mark || null; // Default to 0 if no mark
      return acc;
    }, {});

    try {
      const registration = registrations.find(
        (reg) => reg.teamData?.teamId === teamId
      );

      if (!registration) {
        alert("Registration not found for the specified team ID.");
        return;
      }

      const teamDocRef = doc(
        db,
        "events",
        selectedEventId,
        "registrations",
        registration.id
      );

      console.log("Formatted Marks:", formattedMarks);
      console.log("Total Marks:", totalMarks);

      // Update the marks and total marks in Firebase
      await updateDoc(teamDocRef, {
        marks: formattedMarks,
        totalMarks,
      });

      // Update local state
      setSubmittedTeams((prev) => ({ ...prev, [teamId]: true }));
      alert("Marks submitted successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error submitting marks:", error);
      alert("Failed to submit marks. Please try again.");
    }
  };

  const getMarkFromFirebase = (teamId, criterionName) => {
    if (!marks[teamId]) return undefined; // Return undefined if no marks for team
    return marks[teamId][criterionName] || undefined; // Return specific criterion mark
  };

  const handleMarksChange = (teamId, criteriaIndex, value) => {
    const maxMarks = marksCriteria[criteriaIndex]?.totalMarks || 0;
    const enteredMarks = Number(value);

    if (enteredMarks > maxMarks) {
      setErrorMessage(
        `Marks cannot exceed the maximum of ${maxMarks} for ${marksCriteria[criteriaIndex].name}.`
      );
      setMarks((prev) => ({
        ...prev,
        [teamId]: {
          ...prev[teamId],
          [criteriaIndex]: maxMarks,
        },
      }));
      return;
    }

    setErrorMessage("");
    setMarks((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [criteriaIndex]: enteredMarks,
      },
    }));
  };

  const calculateTotalMarks = (teamId) => {
    const teamMarks = marks[teamId] || {};
    return Object.values(teamMarks).reduce((sum, mark) => sum + (mark || 0), 0);
  };

  const getTopTeams = () => {
    return [...registrations]
      .map((registration) => ({
        ...registration,
        totalMarks: calculateTotalMarks(registration.teamData?.teamId),
      }))
      .sort((a, b) => b.totalMarks - a.totalMarks)
      .slice(0, 3); // Top 3 teams
  };

  const topTeams = getTopTeams();

  const handleAddCriteria = async () => {
    if (!newCriteria.name.trim()) {
      alert("Criteria name is required.");
      return;
    }
    const totalMarks = parseInt(newCriteria.totalMarks, 10);
    if (isNaN(totalMarks) || totalMarks <= 0) {
      alert("Please enter a valid number for total marks.");
      return;
    }

    const updatedCriteria = [
      ...marksCriteria,
      { name: newCriteria.name, totalMarks },
    ];

    try {
      const eventDocRef = doc(db, "events", selectedEventId);
      await updateDoc(eventDocRef, { marksCriteria: updatedCriteria });
      setMarksCriteria(updatedCriteria);
      setShowCriteriaPopup(false);
      setNewCriteria({ name: "", totalMarks: "" });
    } catch (error) {
      console.error("Error updating criteria in Firebase:", error);
      alert("Failed to add criteria. Please try again.");
    }
  };

  const exportToExcel = () => {
    const teamDetailsData = []; // Data for the Team Details sheet
    const memberDetailsData = []; // Data for the Member Details sheet

    registrations.forEach((registration) => {
      const teamId = registration.teamData?.teamId || "N/A";
      const teamName = registration?.["Team Name"] || "N/A";
      const teamSize = registration.teamData?.teamSize || "N/A";

      // Add marks criteria
      const marksData = {};
      marksCriteria.forEach((criteria) => {
        marksData[`${criteria.name} (${criteria.totalMarks})`] =
          registration.marks?.[criteria.name] || "N/A";
      });
      const totalMarks = calculateTotalMarks(teamId);

      // Add team details to the Team Details sheet
      teamDetailsData.push({
        "Team ID": teamId,
        "Team Name": teamName,
        "Team Size": teamSize,
        ...marksData,
        "Total Marks": totalMarks,
      });

      // Add a row for each team member to the Member Details sheet
      registration.teamData?.members?.forEach((member) => {
        const memberData = {
          "Team ID": teamId,
        };

        // Add form fields to member rows
        formFields.forEach((field) => {
          memberData[field.label] = Array.isArray(registration[field.label])
            ? registration[field.label].join(", ")
            : registration[field.label] || "N/A";
        });

        // Add member-specific details
        teamConfig?.memberDetails.forEach((detail) => {
          memberData[detail.label] = member[detail.label] || "N/A";
        });

        memberDetailsData.push(memberData);
      });
    });

    // Function to create a worksheet and append to an Excel file
    const appendSheetToWorkbook = (workbook, data, sheetName) => {
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Adjust column widths dynamically
      const columnWidths = Object.keys(data[0] || {}).map((key) => ({
        width: Math.max(15, key.length + 5), // Adjust based on header lengths
      }));
      worksheet["!cols"] = columnWidths;

      // Append the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    };

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Add sheets for team details and member details
    appendSheetToWorkbook(workbook, teamDetailsData, "Team Details");
    appendSheetToWorkbook(workbook, memberDetailsData, "Member Details");

    // Write the workbook to an Excel file
    XLSX.writeFile(workbook, "event_details.xlsx");
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="registrations-table-container">
      <h2>Registrations</h2>

      <div style={{ marginBottom: 10 }}>
        <label>
          Select Event:
          <select
            style={{ backgroundColor: "#333" }}
            value={selectedEventId || ""}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={() => setShowCriteriaPopup(true)}
        className="add-criteria-button"
      >
        Add Criteria
      </button>
      <button onClick={exportToExcel} className="export-button">
        Export to Excel
      </button>

      <p>
        <b>Total Teams : </b>
        {registrations.length}
      </p>

      {errorMessage && <div className="error-message">{errorMessage}</div>}

      {showCriteriaPopup && (
        <div className="popup-container">
          <div className="popup-content">
            <h3>Add New Criteria</h3>
            <label>
              Criteria Name:
              <input
                type="text"
                style={{ marginTop: 6 }}
                value={newCriteria.name}
                onChange={(e) =>
                  setNewCriteria((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </label>
            <label>
              Total Marks:
              <input
                type="number"
                style={{ marginTop: 6 }}
                value={newCriteria.totalMarks}
                onChange={(e) =>
                  setNewCriteria((prev) => ({
                    ...prev,
                    totalMarks: e.target.value,
                  }))
                }
              />
            </label>
            <div className="popup-buttons" style={{ marginTop: 10 }}>
              <button
                onClick={handleAddCriteria}
                style={{ marginRight: 10 }}
                className="export-button"
              >
                Add
              </button>
              <button
                onClick={() => setShowCriteriaPopup(false)}
                className="export-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="registrations-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Team ID</th>
              {formFields.map((field, index) => (
                <th key={`field-${index}`}>{field.label}</th>
              ))}
              <th>Team Size</th>
              {marksCriteria.map((criteria, index) => (
                <th className="criteria" key={`criteria-${index}`}>
                  {criteria.name} ({criteria.totalMarks})
                </th>
              ))}
              <th>Total Marks</th>
              <th style={{ width: 300 }}>Members</th>

              <th>Submit</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((registration) => (
              <tr key={registration.id}>
                <td>{registration.teamData?.teamId || "N/A"}</td>
                {formFields.map((field, index) => (
                  <td key={`field-${index}`}>
                    {Array.isArray(registration[field.label])
                      ? registration[field.label].join(", ")
                      : registration[field.label] || "N/A"}
                  </td>
                ))}
                <td>{registration.teamData?.teamSize || "N/A"}</td>
                {marksCriteria.map((_, index) => (
                  <td key={`marks-${index}`}>
                    {submittedTeams[registration.teamData?.teamId] ? (
                      registration.marks ? (
                        registration.marks[marksCriteria[index].name] || (
                          <input
                            type="number"
                            value={
                              marks[registration.teamData?.teamId]?.[index] ||
                              ""
                            }
                            onChange={(e) =>
                              handleMarksChange(
                                registration.teamData?.teamId,
                                index,
                                e.target.value
                              )
                            }
                            className="marks-input"
                            max={marksCriteria[index]?.totalMarks || 100}
                          />
                        )
                      ) : (
                        "N/A"
                      )
                    ) : (
                      <input
                        type="number"
                        value={
                          marks[registration.teamData?.teamId]?.[index] || ""
                        }
                        onChange={(e) =>
                          handleMarksChange(
                            registration.teamData?.teamId,
                            index,
                            e.target.value
                          )
                        }
                        className="marks-input"
                        max={marksCriteria[index]?.totalMarks || 100}
                      />
                    )}
                  </td>
                ))}

                <td>{calculateTotalMarks(registration.teamData?.teamId)}</td>
                <td>
                  {registration.teamData?.members ? (
                    <ul>
                      {registration.teamData.members.map((member, index) => (
                        <li key={index} className="team-member-card">
                          <button
                            onClick={() =>
                              toggleMemberDetails(`${registration.id}-${index}`)
                            }
                            className="toggle-member-details"
                          >
                            {member[teamConfig?.memberDetails[0]?.label] ||
                              `Member ${index + 1}`}
                          </button>
                          {expandedMembers[`${registration.id}-${index}`] && (
                            <ul>
                              {teamConfig?.memberDetails.map(
                                (detail, detailIndex) => (
                                  <li key={detailIndex}>
                                    <strong>{detail.label}:</strong>{" "}
                                    {member[detail.label] || "N/A"}
                                  </li>
                                )
                              )}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td>
                  {(() => {
                    const teamMarks =
                      registrations.find(
                        (reg) =>
                          reg.teamData?.teamId === registration.teamData?.teamId
                      )?.marks || {}; // Fetch marks for this team

                    // Check if all criteria marks are defined
                    const allCriteriaFilled = marksCriteria.every(
                      (criteria) =>
                        teamMarks[criteria.name] !== undefined &&
                        teamMarks[criteria.name] !== null
                    );

                    return allCriteriaFilled ? (
                      <span>Marks are Submitted</span>
                    ) : (
                      <button
                        onClick={() =>
                          handleSubmitMarks(registration.teamData?.teamId)
                        }
                        className="submit-button"
                      >
                        Submit
                      </button>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Top 3 Teams</h3>
      <div style={{ overflowX: "auto" }}>
        <table className="registrations-table">
          <thead>
            <tr>
              <th>Team ID</th>
              <th>Team Name</th>
              <th>Team Size</th>
              <th>Total Marks</th>
            </tr>
          </thead>
          <tbody>
            {topTeams.map((team) => (
              <tr key={team.id}>
                <td>{team.teamData?.teamId || "N/A"}</td>
                <td>{team?.["Team Name"] || "N/A"}</td>
                <td>{team.teamData?.teamSize || "N/A"}</td>
                <td>{team.totalMarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegistersTable;
