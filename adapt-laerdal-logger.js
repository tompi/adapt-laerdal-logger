define([ "core/js/adapt" ], function(Adapt) {
    var logToLaerdal = async function (scormSessionId, courseId, contentId, contentType, actionId) {
         const response = await fetch("https://scorm-log.azurewebsites.net/api/scorm", {
             method: 'POST',
             mode: 'cors',
             cache: 'no-cache',
             headers: {
                 'Content-Type': 'application/json'
             },
             body: JSON.stringify({ scormSessionId, courseId, contentId, contentType, actionId })
         });
         return await response.json();
    }
    // Expose this logger to the world...
    window.logToLeardal = logToLaerdal;

	function onViewReady(view) {
		var fields = {
			page: location.pathname + location.search + location.hash,
			title: view.model.get("title")
		};

		ga("set", fields);

		ga("send", "pageview", { hitCallback: function() {
			Adapt.trigger("googleAnalytics:hitCallback", _.extend(fields, {
				hitType: "pageview"
			}));
		}});
	}

	function onDrawerToggle() {
		trackEvent("Interactions", "Pop-up", "Drawer");
	}

	function onDrawerTriggerCustomView($element) {
		if ($element.hasClass("pagelevelprogress")) {
			trackEvent("Interactions", "Pop-up", "Page Level Progress");
		}
		if ($element.hasClass("resources")) {
			trackEvent("Interactions", "Pop-up", "Resources");
		}
	}

	function onIsMediaPlayingChange(model, isMediaPlaying) {
		if (isMediaPlaying) return trackEvent("Videos", "Play", model.get("title"));

		var video = $("[data-adapt-id='" + model.get("_id") + "']").find("video")[0];
		var duration = video && video.duration;

		if (!duration) return;

		var percentage = parseInt(video.currentTime / duration * 100, 10);

		trackEvent("Videos", "Percentage seen", model.get("title"), percentage);
	}

	function onNotifyOpened(view) {
		var subView = view.subView;
		var model = subView ? subView.model : view.model;

		trackEvent("Interactions", "Pop-up", model.get("title"));
	}

	function trackEvent(category, action, label, value, isNonInteraction) {
		var event = {
			hitType: "event",
			eventCategory: category,
			eventAction: action,
			eventLabel: label,
			hitCallback: function() {
				Adapt.trigger("googleAnalytics:hitCallback", event);
			}
		};

		if (_.isNumber(value)) event.eventValue = value;
		if (isNonInteraction) event.nonInteraction = isNonInteraction;

		ga("send", event);
	}

	function onHitCallback(data) {
		Adapt.trigger("notify:push", {
			title: new Date().toLocaleTimeString() + " Google Analytics hit sent:",
			body: "<span>" + JSON.stringify(data, null, "\t") + "</span>",
			_classes: "google-analytics",
			_timeout: 2500
		});
	}

	Adapt.once("app:dataReady", function() {
		var config = Adapt.config.get("_googleAnalytics");

		if (!config || !config._isEnabled) return;

		$("head").append(Handlebars.templates.googleAnalytics(config));

		Adapt.on({
			"menuView:ready pageView:ready": onViewReady,
			"navigation:toggleDrawer": onDrawerToggle,
			"drawer:triggerCustomView": onDrawerTriggerCustomView, // plp, resources
			"notify:opened": onNotifyOpened,
			"googleAnalytics:trackEvent": trackEvent
		});

		if (config._isDebugMode) {
			Adapt.on("googleAnalytics:hitCallback", onHitCallback);
		}

		Adapt.components.where({ _component: "media" }).forEach(function(model) {
			model.on("change:_isMediaPlaying", onIsMediaPlayingChange);
		});
	});

});
