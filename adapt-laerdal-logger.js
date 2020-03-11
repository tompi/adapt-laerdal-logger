define(["core/js/adapt"], function (Adapt) {

    // Method for generating session id
    // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var session = {
        scormSessionId: uuidv4()
    };

    // Method used to send data to custom log table
    async function logToLaerdal(actionId, durationSeconds, additionalInfo) {
        console.log(session);
        const response = await fetch("https://scorm-log.azurewebsites.net/api/scorm", {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scormSessionId: session.scormSessionId,
                classroomSessionId: session.cprId,
                courseId: session.courseId,
                contentId: Adapt.location._currentLocation,
                contentType: Adapt.location._contentType,
                actionId,
                durationSeconds,
                additionalInfo
            })
        });
        return await response.json();
    }

    // Method used to parse query string parameters
    // Borrowed from:
    // https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
    function getParams(query) {
        if (!query) {
            return {};
        }

        return (/^[?#]/.test(query) ? query.slice(1) : query)
            .split('&')
            .reduce((params, param) => {
                let [key, value] = param.split('=');
                params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
                return params;
            }, {});
    }

    // Expose this logger to the world...
    window.logToLeardal = logToLaerdal;

    // Triggered when all the course data is loaded AND all the models/mappings have been setup.
    function onDataReady() {
        console.log("onDataReady");
        session.cprId = getParams(window.location.search)["cprid"];
        session.courseId = Adapt.course.title;
    }

    function onIsMediaPlayingChange(model, isMediaPlaying) {
        var action = isMediaPlaying ? "STOP" : "PLAY";
        var videoTitle = model.get("title");

        var video = $("[data-adapt-id='" + model.get("_id") + "']").find("video")[0];
        var duration = 0;
        var percentage = 0;
        if (video) {
            duration = video.duration;
            percentage = parseInt(video.currentTime / duration * 100, 10);
        }

        logToLaerdal(action, duration, videoTitle + " (" + percentage + " %)");
    }

    Adapt.once("app:dataReady", function () {
        Adapt.on({
            "app:dataReady": onDataReady,
            "menuView:ready pageView:ready": logToLaerdal,
            "navigation:toggleDrawer": logToLaerdal,
            "drawer:triggerCustomView": logToLaerdal, // plp, resources
            "notify:opened": logToLaerdal
        });

        Adapt.components.where({_component: "media"}).forEach(function (model) {
            model.on("change:_isMediaPlaying", onIsMediaPlayingChange);
        });
    });

});
