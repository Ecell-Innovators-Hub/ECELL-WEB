import React, { useEffect, useState } from "react";
import "./NewEvent.css";
import Cropper from "react-easy-crop";
import addLogo from "./../assets/images/Add_image.png";
import { db, storage } from "../firebase";
import { doc, getDoc, setDoc, collection, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useLocation } from "react-router-dom";

const NewEvent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const eventId = location.state?.eventId || null;

  const [persons, setPersons] = useState([
    {
      personType: "student",
      role: "",
      name: "",
      phone: "",
      email: "",
      department: "",
      image: null,
    },
  ]);

  const [mainImage, setMainImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const [locationField, setLocationField] = useState("");
  const [department, setDepartment] = useState("");
  const [firstPrize, setFirstPrize] = useState("");
  const [secondPrize, setSecondPrize] = useState("");
  const [thirdPrize, setThirdPrize] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [regDate, setRegDate] = useState("");
  const [regTime, setRegTime] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (eventId) {
        try {
          const eventDocRef = doc(db, "events", eventId);
          const eventDoc = await getDoc(eventDocRef);

          if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            setEventName(eventData.eventName || "");
            setDepartment(eventData.department || "");
            setEventDescription(eventData.description || "");
            setEventDate(eventData.date || "");
            setEventTime(eventData.time || "");
            setRegDate(eventData.regDate || "");
            setRegTime(eventData.regTime || "");
            setLocationField(eventData.location || "");
            setFirstPrize(eventData.firstPrize || "");
            setSecondPrize(eventData.secondPrize || "");
            setThirdPrize(eventData.thirdPrize || "");
            setMainImage(eventData.mainImage || ""); // Reset for editing
            if (eventData.mainImage) {
              setImagePreview(eventData.mainImage.url);
            }
            setPersons(
              eventData.coordinators || [
                {
                  personType: "student",
                  role: "",
                  name: "",
                  phone: "",
                  email: "",
                  department: "",
                  image: null,
                },
              ]
            );
          }
        } catch (error) {
          console.error("Error fetching event details:", error);
        }
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const handleAddPerson = () => {
    if (persons.length < 2) {
      setPersons([
        ...persons,
        {
          personType: "student",
          role: "",
          name: "",
          phone: "",
          email: "",
          department: "",
          image: null,
        },
      ]);
    } else {
      alert("You can only add up to two persons.");
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setMainImage(file);
    }
  };

  const handleRemovePerson = (index) => {
    const updatedPersons = persons.filter((_, i) => i !== index);
    setPersons(updatedPersons);
  };

  const handlePersonChange = (index, field, value) => {
    const updatedPersons = persons.map((person, i) =>
      i === index ? { ...person, [field]: value } : person
    );
    setPersons(updatedPersons);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      let mainImageUrl = imagePreview;

      if (mainImage) {
        const mainImageRef = ref(storage, `events/${mainImage.name}`);
        await uploadBytes(mainImageRef, mainImage);
        mainImageUrl = await getDownloadURL(mainImageRef);
      }

      const coordinators = await Promise.all(
        persons.map(async (person) => {
          if (person.image) {
            const personImageRef = ref(
              storage,
              `coordinators/${person.image.name}`
            );
            await uploadBytes(personImageRef, person.image);
            const personImageUrl = await getDownloadURL(personImageRef);
            return {
              ...person,
              image: {
                url: personImageUrl,
                name: person.image.name,
                type: person.image.type,
                size: person.image.size,
              },
            };
          }
          return person;
        })
      );

      const eventData = {
        eventName,
        department,
        description: eventDescription,
        date: eventDate,
        time: eventTime,
        regDate,
        regTime,
        location: locationField,
        firstPrize,
        secondPrize,
        thirdPrize,
        mainImage: {
          url: mainImageUrl,
        },
        coordinators,
      };

      if (eventId) {
        const eventDocRef = doc(db, "events", eventId);
        await updateDoc(eventDocRef, eventData);
        console.log("Event updated successfully!");
        navigate("/regform", { state: { eventId: eventId } });
      } else {
        const eventDocRef = doc(collection(db, "events"));
        await setDoc(eventDocRef, { ...eventData, docid: eventDocRef.id });
        console.log("Event created successfully!");
        navigate("/regform", { state: { eventId: eventDocRef.id } });
      }
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  return (
    <form className="new-event-container" onSubmit={handleSubmit}>
      <h1 className="title">{eventId ? "Edit Event" : "Create New Event"}</h1>

      <div className="form-section">
        <div className="left-column">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            {/* Circular frame for cropping */}
            <div
              style={{
                position: "relative",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                overflow: "hidden",
                backgroundColor: "#333",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {imagePreview ? (
                <>
                  {isHovered ? (
                    <Cropper
                      image={imagePreview}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={() => {}}
                      cropShape="round"
                      showGrid={false}
                      style={{
                        containerStyle: {
                          width: "120px",
                          height: "120px",
                        },
                        mediaStyle: {
                          width: "100%",
                          height: "100%",
                        },
                      }}
                    />
                  ) : (
                    <img
                      src={imagePreview}
                      style={{ width: "100%", height: "100%" }}
                      alt="Preview"
                    />
                  )}
                </>
              ) : (
                <img
                  src={addLogo}
                  alt="Add Logo"
                  style={{
                    width: "60px",
                    height: "60px",
                    marginLeft: 5,
                    marginTop: 5,
                  }}
                />
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
              id="fileUpload"
              required
            />
            <label htmlFor="fileUpload" className="choose-image">
              Choose Image
            </label>
          </div>

          <label>Location</label>
          <input
            type="text"
            placeholder="Location"
            required
            value={locationField}
            onChange={(e) => setLocationField(e.target.value)}
          />

          <label>Department</label>
          <select
            required
            value={department}
            style={{ backgroundColor: "#333" }}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="" disabled>
              Select Department
            </option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="IT">IT</option>
            <option value="EEE">EEE</option>
            <option value="AIML">AIML</option>
            <option value="AI&DS">AI&DS</option>
            <option value="CSBS">CSBS</option>
            <option value="CE">CE</option>
            <option value="ME">ME</option>
            {/* Add more options as needed */}
          </select>

          <div className="date-time">
            <div>
              <label>Registration Date</label>
              <input
                type="date"
                required
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
              />
            </div>
            <div>
              <label>Registration Time</label>
              <input
                type="time"
                required
                value={regTime}
                onChange={(e) => setRegTime(e.target.value)}
              />
            </div>
          </div>

          <label>1st Prize</label>
          <input
            type="text"
            placeholder="1st Prize"
            required
            value={firstPrize}
            onChange={(e) => setFirstPrize(e.target.value)}
          />

          <label>2nd Prize</label>
          <input
            type="text"
            placeholder="2nd Prize"
            required
            value={secondPrize}
            onChange={(e) => setSecondPrize(e.target.value)}
          />

          <label>3rd Prize</label>
          <input
            type="text"
            placeholder="3rd Prize"
            required
            value={thirdPrize}
            onChange={(e) => setThirdPrize(e.target.value)}
          />
        </div>

        <div className="right-column">
          <label>Name of the Event</label>
          <input
            type="text"
            placeholder="Event Name"
            required
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />

          <div className="date-time">
            <div>
              <label>Event Date</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <label>Event Time</label>
              <input
                type="time"
                required
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>

          <label>Description</label>
          <textarea
            placeholder="Description of the Event"
            required
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
          ></textarea>

          <label>Persons</label>
          {persons.map((person, index) => (
            <div key={index} className="person-section">
              <div className="radio-buttons">
                <label>
                  <input
                    type="radio"
                    name={`person-type-${index}`}
                    value="student"
                    checked={person.personType === "student"}
                    onChange={() =>
                      handlePersonChange(index, "personType", "student")
                    }
                    required
                  />
                  Student
                </label>
                <label>
                  <input
                    type="radio"
                    name={`person-type-${index}`}
                    value="faculty"
                    checked={person.personType === "faculty"}
                    onChange={() =>
                      handlePersonChange(index, "personType", "faculty")
                    }
                  />
                  Faculty
                </label>
              </div>

              <label>Role</label>
              <input
                type="text"
                placeholder="Role"
                required
                value={person.role}
                onChange={(e) =>
                  handlePersonChange(index, "role", e.target.value)
                }
              />

              <label>Name</label>
              <input
                type="text"
                placeholder="Name"
                required
                value={person.name}
                onChange={(e) =>
                  handlePersonChange(index, "name", e.target.value)
                }
              />

              <label>Image</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) =>
                  handlePersonChange(index, "image", e.target.files[0])
                }
              />

              <label>Phone Number</label>
              <input
                type="text"
                placeholder="Phone Number"
                required
                value={person.phone}
                onChange={(e) =>
                  handlePersonChange(index, "phone", e.target.value)
                }
              />

              <label>Email ID</label>
              <input
                type="email"
                placeholder="Email"
                required
                value={person.email}
                onChange={(e) =>
                  handlePersonChange(index, "email", e.target.value)
                }
              />

              <label>Department</label>
              <input
                type="text"
                placeholder="Department"
                required
                value={person.department}
                onChange={(e) =>
                  handlePersonChange(index, "department", e.target.value)
                }
              />
              <button
                type="button"
                onClick={() => handleRemovePerson(index)}
                className="add-person"
              >
                Remove Person
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddPerson}
            className="add-person"
          >
            Add Person
          </button>
        </div>
      </div>

      <button type="submit" className="submit-button">
        Add Event
      </button>
    </form>
  );
};

export default NewEvent;
