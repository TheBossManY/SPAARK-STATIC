const video = document.getElementById("video");
const detailsContainer = document.getElementById("details-content");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
    });
}

async function getLabeledFaceDescriptions() {
  const labels = ["Pragalbh", "Elon", "Saqib"]; // Add your actual folder names here

  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`./labels/${label}/${i}.png`);
        const detections = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detections) {
          descriptions.push(detections.descriptor);
        }
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

async function fetchDetails(label) {
  try {
    const response = await fetch(`./labels/${label}/details.json`);
    if (!response.ok) throw new Error("Details not found");
    const data = await response.json();
    displayDetails(data);
  } catch (error) {
    detailsContainer.textContent = `No details found for ${label}`;
  }
}

function displayDetails(data) {
  detailsContainer.innerHTML = `
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Course:</strong> ${data.course}</p>
    <p><strong>Status:</strong> ${data.status}</p>
    <p><strong>College:</strong> ${data.college}</p>
    <p><strong>Roll Number:</strong> ${data.rollnumber}</p>
    <p><strong>Exam Form:</strong> ${data.examform}</p>
  `;
}

function isBlinking(landmarks) {
  const getEyeOpenness = (eye) => {
    const vertical = Math.abs(eye[1].y - eye[5].y) + Math.abs(eye[2].y - eye[4].y);
    const horizontal = Math.abs(eye[0].x - eye[3].x);
    return vertical / (2.0 * horizontal);
  };

  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const avgOpenness = getEyeOpenness(leftEye);
  const rightOpenness = getEyeOpenness(rightEye);

  return avgOpenness < 1;
}

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  let livenessConfirmedFor = null;

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    if (resizedDetections.length > 0) {
      const blinked = isBlinking(resizedDetections[0].landmarks);
      const result = faceMatcher.findBestMatch(resizedDetections[0].descriptor);
      const label = result.label;

      if (blinked || livenessConfirmedFor === label) {
        livenessConfirmedFor = label;

        if (label.toLowerCase() !== "unknown") {
          await fetchDetails(label);
        } else {
          detailsContainer.textContent = "Face not recognized.";
        }

        const box = resizedDetections[0].detection.box;
        const xOffset = -125;
        const yOffset = 0;

        const adjustedBox = {
          x: box.x + xOffset,
          y: box.y + yOffset,
          width: box.width,
          height: box.height,
        };

        const drawBox = new faceapi.draw.DrawBox(adjustedBox, {
          label: result.toString(),
        });

        drawBox.draw(canvas);
      } else {
        detailsContainer.textContent = "Please blink to confirm liveness.";
      }
    } else {
      detailsContainer.textContent = "No face detected.";
    }
  }, 100);
});

const vehicleData = [
  {
    number: "UP32FZ1010",
    type: "2 Wheeler",
    "name-of-vehicle": "Royal Enfield 350",
    Color: "Black",
    "Owner Name": "Surya Pratap",
    "Owner Phone": "93455129431",
    "Owner Roll Number": "234231212"
  },
  {
    number: "MH12AB1234",
    type: "4 Wheeler",
    "name-of-vehicle": "Toyota Innova",
    Color: "White",
    "Owner Name": "Rahul Kumar",
    "Owner Phone": "9876543210",
    "Owner Roll Number": "234231214"
  }
];

function fetchVehicleDetails() {
  const input = document.getElementById('vehicle-number').value.trim().toUpperCase();
  const detailsContainer = document.getElementById('vehicle-details-content');

  const foundVehicle = vehicleData.find(vehicle => vehicle.number.toUpperCase() === input);

  if (foundVehicle) {
    detailsContainer.innerHTML = `
      <p><strong>Vehicle Number:</strong> ${foundVehicle.number}</p>
      <p><strong>Type:</strong> ${foundVehicle.type}</p>
      <p><strong>Vehicle Name:</strong> ${foundVehicle["name-of-vehicle"]}</p>
      <p><strong>Color:</strong> ${foundVehicle.Color}</p>
      <p><strong>Owner Name:</strong> ${foundVehicle["Owner Name"]}</p>
      <p><strong>Owner Phone:</strong> ${foundVehicle["Owner Phone"]}</p>
      <p><strong>Owner Roll Number:</strong> ${foundVehicle["Owner Roll Number"]}</p>
    `;
  } else {
    detailsContainer.innerHTML = "ENTRY DENIED! Vehicle Not Found!";
  }
}
