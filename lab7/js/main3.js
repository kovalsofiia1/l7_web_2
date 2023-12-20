document.addEventListener("DOMContentLoaded", () => {
    const work = document.getElementById("work");
    const animationContainer = document.getElementById("animationContainer");
    const controls = document.getElementById("controls");
    const playButton = document.getElementById("playButton");
    const closeButton = document.getElementById("closeButton");
    const startButton = document.getElementById("startButton");
    const stopButton = document.getElementById("stopButton");
    const reloadButton = document.getElementById("reloadButton");

    const sentLocalStorageButton = document.querySelector(
        ".send-localstorage-data"
    );
    const workArea = document.querySelector(".work");
    const tableArea = document.querySelector(".data-table");

    const pic = document.querySelector(".picture");

    let animating = false;
    let animArea;
    let ball;
    let dx, dy;
    let ballLeft;
    let ballBottom;

    playButton.addEventListener("click", playEvent);
    closeButton.addEventListener("click", cancelEvent);

    startButton.addEventListener("click", startAnimation);
    stopButton.addEventListener("click", stopAnimation);
    reloadButton.addEventListener("click", reloadAnimation);
    sentLocalStorageButton.addEventListener("click", sentLocalStorage);

    function playEvent() {
        sendEventToServer("playEvent", { action: "reset" });
        localStorage.removeItem("events");
        pic.style.display = "none";
        if (workArea.style.display !== "flex") {
            workArea.style.display = "flex";
            workArea.style.flexDirection = "column";
        }
        if (ball) {
            ball.remove();
        }

        animArea = document.querySelector(".anim");
        ball = createBall();

        startButton.style.display = "flex";
        reloadButton.style.display = "none";
        stopButton.style.display = "none";
        closeButton.style.display = "flex";
        tableArea.style.display = "none";
        playButton.style.display="none";

        addMessage("Start of the game");
    }

    function cancelEvent() {
        workArea.style.display = "none";
        tableArea.style.display = "table";
        pic.style.display='block';
        playButton.style.display="flex";

        let localStorageData = JSON.parse(localStorage.getItem("events")) || [];

        document.querySelector(".local-storage-data").textContent =
            formatLocalStorageData(localStorageData);
        if(document.querySelector(".local-storage-data").textContent===''){
            fetch("./php/localstorage_events.json")
                .then((response) => response.json())
                .then((serverData) => {
                    document.querySelector(".local-storage-data").textContent =
                        formatLocalStorageData(serverData);
                })
                .catch((error) =>
                    console.error("Error fetching server data:", error)
                );
        }

        fetch("./php/events.json")
            .then((response) => response.json())
            .then((serverData) => {
                document.querySelector(".server-data").textContent =
                    formatServerData(serverData);
            })
            .catch((error) =>
                console.error("Error fetching server data:", error)
            );
    }

    function startAnimation() {
        if (!animating) {
            startButton.style.display = "none";
            reloadButton.style.display = "none";
            stopButton.style.display = "flex";

            ({ dx, dy } = getRandomSpeed());

            animating = true;
            addMessage("Animation started");

            animateBall();
        }
    }

    function stopAnimation() {
        startButton.style.display = "none";
        stopButton.style.display = "none";
        reloadButton.style.display = "flex";

        animating = false;
        addMessage("Animation stopped");
    }

    function reloadAnimation() {
        if (ball) {
            ball.remove();
        }
        ball = createBall();
        ({ dx, dy } = getRandomSpeed());
        animating = false;

        stopButton.style.display = "none";
        reloadButton.style.display = "none";
        startButton.style.display = "flex";

        addMessage("Animation reloaded");
    }

    function sentLocalStorage() {
        let events = localStorage.getItem("events");
        if (events) {
            fetch("./php/localstorage_event_logger.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: events,
            })
                .then((response) => response.json())
                .then((data) => console.log(data))
                .catch((error) => console.error("Error:", error));

            localStorage.removeItem("events");
        }
    }

    function createBall() {
        const ballWidth = 30;
        const ballHeight = 30;

        const b = document.createElement("div");
        b.style.width = ballWidth + "px";
        b.style.height = ballHeight + "px";
        b.style.backgroundColor = "blue";
        b.style.position = "absolute";
        b.style.borderRadius='50%';

        ballLeft =
            getRandomNumber(0, animArea.clientWidth - ballWidth) + "px";
        ballBottom = "0px";

        b.style.left = ballLeft;
        b.style.bottom = ballBottom;

        animArea.appendChild(b);
        return b;
    }

    function animateBall() {
        if (!animating) return;

        let rect = ball.getBoundingClientRect();
        let animRect = animArea.getBoundingClientRect();

        let newLeft = rect.left - animRect.left + dx;
        let newRight = rect.right - animRect.left + dx;
        let newTop = rect.top - animRect.top + dy;
        let newBottom = rect.bottom - animRect.top + dy;

        if (newLeft <= 0 || newRight >= animRect.width) {
            dx = -dx;
            addMessage("Hitting a vertical wall");
        }

        if (newBottom >= animRect.height) {
            dy = -dy;
        } else if (newTop <= 0 ) {
            addMessage("Hitting the bottom wall");
            stopAnimation();

            ball.remove();
            ball = null;

            stopButton.style.display = "none";
            startButton.style.display = "none";
            reloadButton.style.display = "flex";
            return;
        }

        ball.style.left = rect.left - animRect.left + dx + "px";
        ball.style.top = rect.top - animRect.top + dy + "px";

        requestAnimationFrame(animateBall);
    }

    function getRandomSpeed() {
        let dx;
        let dy;

        do {
            dx = getRandomNumber(-12, 12);
        } while (Math.abs(dx) < 8);

        do {
            dy = getRandomNumber(-12, 12);
        } while (Math.abs(dy) < 8);

        return { dx, dy };
    }

    function getRandomNumber(min, max) {
        return Math.random() * (max - min) + min;
    }

    function addMessage(message) {
        const messageContainer = document.querySelector(".message-container");
        messageContainer.textContent = message;
        sendEventToServer(message, { dx, dy });
        storeEventLocally(message, { dx, dy });
    }

    function sendEventToServer(eventType, eventData) {
        fetch("./php/event_logger.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: eventType,
                data: eventData,
                timestamp: new Date().toISOString(),
            }),
        })
            .then((response) => response.json())
            .then((data) => console.log(data))
            .catch((error) => console.error("Error:", error));
    }

    function storeEventLocally(eventType, eventData) {
        let events = JSON.parse(localStorage.getItem("events")) || [];
        let eventId = events.length + 1;

        let newEvent = {
            id: eventId,
            type: eventType,
            data: eventData,
            localTimestamp: new Date().toISOString(),
        };

        events.push(newEvent);
        localStorage.setItem("events", JSON.stringify(events));
    }

    function formatLocalStorageData(dataArray) {
        return dataArray
            .map((item) => {
                return (
                    `Event ID: ${item.id}\n` +
                    `Type: ${item.type}\n` +
                    `DX: ${item.data.dx}\n` +
                    `DY: ${item.data.dy}\n` +
                    `Local Timestamp: ${item.localTimestamp}\n\n`
                );
            })
            .join("\n");
    }

    function formatServerData(dataArray) {
        return dataArray
            .map((item) => {
                return (
                    `Event ID: ${item.id}\n` +
                    `Type: ${item.type}\n` +
                    `DX: ${item.data.dx}\n` +
                    `DY: ${item.data.dy}\n` +
                    `Timestamp: ${item.timestamp}\n` +
                    `Server Timestamp: ${item.serverTimestamp}\n\n`
                );
            })
            .join("\n");
    }
});
