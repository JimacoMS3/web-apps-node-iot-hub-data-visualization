$(document).ready(function () {
  // if deployed to a site requiring SSL, change to wss://
  var protocol = 'ws://';
  var ws = new WebSocket(protocol + location.host);

  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
    }

    timeData = [];
    temperatureData = [];
    humidityData = [];
    maxLen = 50;

    addData(time, temperature, humidity) {
      this.timeData.push(time);
      this.temperatureData.push(temperature);
      this.humidityData.push(humidity || null);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.temperatureData.shift();
        this.humidityData.shift();
      }
    }
  }

  class TrackedDevices {
    Devices = [];

    findDevice(deviceId) {
      for (var i = 0; i < this.Devices.length; ++i) {
        if (this.Devices[i].deviceId === deviceId) {
          return this.Devices[i];
        }
      }

      return undefined;
    }
  }

  const trackedDevices = new TrackedDevices();

  var chartData = {
    datasets: [
      {
        fill: false,
        label: 'Temperature',
        yAxisID: 'Temperature',
        borderColor: "rgba(255, 204, 0, 1)",
        pointBoarderColor: "rgba(255, 204, 0, 1)",
        backgroundColor: "rgba(255, 204, 0, 0.4)",
        pointHoverBackgroundColor: "rgba(255, 204, 0, 1)",
        pointHoverBorderColor: "rgba(255, 204, 0, 1)",
        spanGaps: true
      },
      {
        fill: false,
        label: 'Humidity',
        yAxisID: 'Humidity',
        borderColor: "rgba(24, 120, 240, 1)",
        pointBoarderColor: "rgba(24, 120, 240, 1)",
        backgroundColor: "rgba(24, 120, 240, 0.4)",
        pointHoverBackgroundColor: "rgba(24, 120, 240, 1)",
        pointHoverBorderColor: "rgba(24, 120, 240, 1)",
        spanGaps: true
      }
    ]
  }

  var chartOptions = {
    title: {
      display: true,
      text: 'Temperature & Humidity Real-time Data',
      fontSize: 36
    },
    scales: {
      yAxes: [{
        id: 'Temperature',
        type: 'linear',
        scaleLabel: {
          labelString: 'Temperature (ºC)',
          display: true
        },
        position: 'left',
      }, {
          id: 'Humidity',
          type: 'linear',
          scaleLabel: {
            labelString: 'Humidity (%)',
            display: true
          },
          position: 'right'
        }]
    }
  }

  // Get the context of the canvas element we want to select
  var ctx = document.getElementById("iotChart").getContext("2d");
  var myLineChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: chartOptions
  });

  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection
  var listOfDevices = document.getElementById("listOfDevices");
  function OnSelectionChange(event) {
    let device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.temperatureData;
    chartData.datasets[1].data = device.humidityData;
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);
  
  ws.onopen = function () { }

  ws.onmessage = function (message) {
    try {
      var messageData = JSON.parse(message.data);
      console.log(messageData);

      // time and temperature are required
      if (!messageData.MessageDate || !messageData.IotData.temperature) {
        return;
      }

      // find or add device to list of tracked devices
      let deviceData = trackedDevices.findDevice(messageData.DeviceId);

      if (deviceData) {
        deviceData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);
      } else {
        const deviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.Devices.push(deviceData);
        deviceData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);

        // add device to the UI list
        var node = document.createElement("option");
        var nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        // if this is the first device being discovered, auto-select it
        if (listOfDevices.selectedIndex === -1) {
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  }
});