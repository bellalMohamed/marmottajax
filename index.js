var marmottajax = function(parameters) {

	if (typeof this.self !== "undefined") {
		return new marmottajax(parameters);
	}
	if (!this.normalize(parameters)) {
        throw "invalid arguments";
    }

	if (this.method !== "get") {
        if (!this.formData) {
            this.formData = "?";
    		for (var key in this.parameters) {
    			this.formData += this.parameters.hasOwnProperty(key) ? "&" + key + "=" + this.parameters[key] : "";
    		}
        }
	}

	else {
        var had = this.url.indexOf("?") > -1;
        if (!had) {
            this.url += "?";
        }
        var first = true;
		for (var key in this.parameters) {
            if (this.parameters.hasOwnProperty(key) && typeof this.parameters[key] === "string") {
                if (first && !had) {
                    this.url += key + "=" + this.parameters[key];
                }
                else {
                    this.url += "&" + key + "=" + this.parameters[key];
                }
                first = false;
            }
		}
	}

	this.setXhr();
	this.setWatcher();

};

marmottajax.validMethods = ["get", "post", "put", "update", "delete"];
marmottajax.prototype.normalize = function(parameters) {

    if (typeof parameters === "string") {
        parameters = {
            url: parameters
        };
    }

    if (typeof parameters !== "object") { return; }
	if (typeof parameters.url !== "string") { return; }

    this.url = parameters.url;
    this.method = "get";
    this.json = false;
    this.watch = -1;
    this.parameters = {};

    if (typeof parameters.method === "string" && marmottajax.validMethods.indexOf(parameters.method.toLowerCase()) > -1) {
        this.method = parameters.method.toLowerCase();
    }
    if (parameters.json) {
        this.json = true;
    }
    if (typeof parameters.watch === "number") {
        this.watch = parameters.watch;
    }
    if (typeof parameters.parameters === "object") {
		this.parameters = parameters.parameters;
	}
	if (typeof parameters.headers === "object") {
		this.headers = parameters.headers;
	}
    if (parameters.formData) {
        this.formData = parameters.formData;
    }

    return true;

};

marmottajax.prototype.setXhr = function() {

	this.xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");

	this.xhr.lastResult = null;

	this.xhr.json = this.json;
	this.xhr.binding = null;

	this.bind = function(binding) {
		this.xhr.binding = binding;
		return this;
	};

	this.cancel = function(callback) {
		this.xhr.abort();
		return this;
	};

	this.xhr.callbacks = {
		success: [],
		change: [],
		error: []
	};

	for (var name in this.xhr.callbacks) {
		if (this.xhr.callbacks.hasOwnProperty(name)) {

			this[name] = function(name) {
				return function(callback) {
					this.xhr.callbacks[name].push(callback);
					return this;
				};
			}(name);

		}
	}

	this.xhr.call = function(categorie, result) {

		for (var i = 0; i < this.callbacks[categorie].length; i++) {
			if (typeof(this.callbacks[categorie][i]) === "function") {

				if (this.binding) {
					this.callbacks[categorie][i].call(this.binding, result);
				}
				else {
					this.callbacks[categorie][i](result);
				}

			}
		}

	};

	this.xhr.onreadystatechange = function() {

		if (this.readyState === 4 && this.status == 200) {

			var result = this.responseText;

			if (this.json) {

				try {
					result = JSON.parse(result);
				}
				catch (error) {
					this.call("error", {
                        status: this.status,
                        message: "invalid json",
                        response: this.responseText
                    });
					return false;
				}

			}

			this.lastResult = result;

			this.call("success", result);

		}
		else if (this.readyState === 4 && this.status == 404) {
			this.call("error", {
                status: this.status,
                message: "not found",
                response: this.responseText
            });
		}
		else if (this.readyState === 4) {
			this.call("error", {
                status: this.status,
                message: "unknow",
                response: this.responseText
            });
		}

	};

	this.xhr.open(this.method, this.url, true);
	this.xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

	if (this.headers) {
		for (header in this.headers) {
			if (this.headers.hasOwnProperty(header)) {
				this.xhr.setRequestHeader(header, this.headers[header]);
			}
		}
	}

	this.xhr.send(typeof this.formData != "undefined" ? this.formData : null);

};

marmottajax.prototype.updateXhr = function() {

	var data = {

		lastResult: this.xhr.lastResult,

		json: this.xhr.json,
		binding: this.xhr.binding,

		callbacks: {
			success: this.xhr.callbacks.success,
			change: this.xhr.callbacks.change,
			error: this.xhr.callbacks.error
		}

	};

	this.xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");

	this.xhr.lastResult = data.lastResult;

	this.xhr.json = data.json;
	this.xhr.binding = data.binding;

	this.xhr.callbacks = {
		success: data.callbacks.success,
		change: data.callbacks.change,
		error: data.callbacks.error
	};

	this.xhr.call = function(categorie, result) {

		for (var i = 0; i < this.callbacks[categorie].length; i++) {
			if (typeof(this.callbacks[categorie][i]) === "function") {

				if (this.binding) {
					this.callbacks[categorie][i].call(this.binding, result);
				}
				else {
					this.callbacks[categorie][i](result);
				}

			}
		}

	};

	this.xhr.onreadystatechange = function() {

		if (this.readyState === 4 && this.status == 200) {

			var result = this.responseText;

			if (this.json) {
				try {
					result = JSON.parse(result);
				}
				catch (error) {
                    this.call("error", {
                        status: this.status,
                        message: "invalid json",
                        response: this.responseText
                    });
					return false;
				}
			}

			var isDifferent = this.lastResult != result;
			try {
				isDifferent = (typeof this.lastResult !== "string" ? JSON.stringify(this.lastResult) : this.lastResult) != (typeof result !== "string" ? JSON.stringify(result) : result);
			}
			catch (error) {}

			if (isDifferent) {
				this.call("change", result);
			}

			this.lastResult = result;

		}
		else if (this.readyState === 4 && this.status == 404) {
            this.call("error", {
                status: this.status,
                message: "not found",
                response: this.responseText
            });
		}
		else if (this.readyState === 4) {
            this.call("error", {
                status: this.status,
                message: "unknow",
                response: this.responseText
            });
		}

	};

	this.xhr.open(this.method, this.url, true);
	this.xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	this.xhr.send(typeof formData != "undefined" ? formData : null);

};

marmottajax.prototype.setWatcher = function() {

	if (this.watch !== -1) {

		this.watchIntervalFunction = function() {
			if (this.xhr.readyState === 4 && this.xhr.status === 200) {
				this.updateXhr();
			}
			this.watcherTimeout();
		};

		this.watcherTimeout();

		this.stop = function() {
			this.setTime(-1);
		};

		this.setTime = function(time) {
			clearTimeout(this.changeTimeout);
			this.watch = typeof time === "number" ? time : this.watch;
			this.watcherTimeout();
		};

	}

};

marmottajax.prototype.watcherTimeout = function() {
	if (this.watch !== -1) {

		this.changeTimeout = setTimeout(function(that) {
			return function() {
				that.watchIntervalFunction();
			};
		}(this), this.watch);

	}
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = marmottajax;
}
