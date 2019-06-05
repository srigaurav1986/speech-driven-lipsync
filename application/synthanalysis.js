var tts= new SpeechSynthesisUtterance("OK GAurav");
var BoundingFrequencyMale = [0,400,560,2400,4800];
var BoundingFrequencyFemale = [0,500,700,3000,6000]; 


var audioContext = new AudioContext();
var FFT_SIZE = 1024;
var samplingFrequency = 44100;
var Error= function(){console.log("failed to get Media");}

var IndicesFrequencyFemale = [];
var IndicesFrequencyMale = [];
for( let m = 0 ; m < BoundingFrequencyMale.length ; m++) {
   IndicesFrequencyMale[m] = Math.round(((2*FFT_SIZE)/samplingFrequency) *BoundingFrequencyMale[m]);
   //IndicesFrequencyFemale[n] = ((2*FFT_SIZE)/samplingFrequency) *BoundingFrequencyFemale[m];
   console.log("IndicesFrequencyMale[",m,"]",IndicesFrequencyMale[m]);
}
getRMS = function (spectrum) {
var rms = 0;
  for (var i = 0; i < spectrum.length; i++) {
    rms += spectrum[i] * spectrum[i];
  }
  rms /= spectrum.length;
  rms = Math.sqrt(rms);
  return rms;
 }

getstPSD = function (spectrum) {
  var sensitivity_threshold = 0.5;
   var    stPSD = new Float32Array(spectrum.length);
	for ( i = 0 ; i< spectrum.length;i++) {
   stPSD[i]= sensitivity_threshold + ((spectrum[i] +20)/140);	
	}
  return stPSD;
 }
var startUserMedia = function(stream){
	console.log("getUserMedia success");
	var input =audioContext.createMediaStreamSource(stream);
	var userSpeechAnalyzer = audioContext.createAnalyser();
	userSpeechAnalyzer.smoothingTimeConstant = 0.2;
	userSpeechAnalyzer.fftSize = FFT_SIZE;
	input.connect(userSpeechAnalyzer); 
	//userSpeechAnalyzer.connect(audioContext.destination);
	
	var node = audioContext.createScriptProcessor(FFT_SIZE*2, 1, 1);
	userSpeechAnalyzer.connect(node);
	node.connect(audioContext.destination);

	node.onaudioprocess = function () {
       // bitcount returns array which is half the FFT_SIZE
       self.spectrum = new Float32Array(userSpeechAnalyzer.frequencyBinCount);
       // getByteFrequencyData returns amplitude for each bin
       userSpeechAnalyzer.getFloatFrequencyData(self.spectrum);
       // getByteTimeDomainData gets volumes over the sample time
       // analyser.getByteTimeDomainData(self.spectrum);
	//console.log(self.spectrum);
        //self.spectrumRMS = self.getRMS(self.spectrum);
 	self.stPSD = self.getstPSD(self.spectrum);
	//console.log(self.stPSD);
	var EnergyBinMale = new Float32Array(BoundingFrequencyMale.length);
	var EnergyBinFemale = new Float32Array(BoundingFrequencyFemale.length);
	var BlendShapeKiss ;
	var BlendShapeLips ;
	var BlenShapeMouth ;
	for ( let m = 0 ; m < BoundingFrequencyMale.length -1 ; m++){
		for ( let j = IndicesFrequencyMale[m]; j<= IndicesFrequencyMale[m+1]; j++) {
			if(stPSD[j] >0){

			EnergyBinMale[m]+= stPSD[j] ; 	
			//EnergyBinFemale[m]+ = stPSD[j];  	

			}
		}
		EnergyBinMale[m] /= (IndicesFrequencyMale[m+1] -IndicesFrequencyMale[m] ); 
	//	EnergyBinFemale[m] = EnergyBinFemale[m]/(IndicesFrequencyFemale[m+1] -IndicesFrequencyFemale[m] ) 
	//	console.log("EnergyBinMale",EnergyBinMale[m]);
	}	
	
	if( EnergyBinMale[1] > 0.2 ) {
	BlendShapeKiss = 1 -2*EnergyBinMale[2] ;
	}else{
	BlendShapeKiss = ( 1-2*EnergyBinMale[2])*5*EnergyBinMale[1];
	}

	BlendShapeLips = 3*EnergyBinMale[3];
	BlenShapeMouth = 0.8*(EnergyBinMale[1]-EnergyBinMale[3]);

	console.log("Blendershape", BlenShapeMouth,BlendShapeLips,BlendShapeKiss);
	//console.log(self.stPSD);
	//console.log(self.vol);
       // get peak - a hack when our volumes are low
       //if (self.vol > self.peak_volume) self.peak_volume = self.vol;
       //self.volume = self.vol;

     };	

	};
	//navigator.mediaDevices.getUserMedia({"audio":true},startUserMedia,Error);
	tts.onstart = function(){
	navigator.mediaDevices.getUserMedia({
        audio: true
      })
      // set `getUserMedia()` constraints to "auidooutput", where avaialable
      // see https://bugzilla.mozilla.org/show_bug.cgi?id=934425, https://stackoverflow.com/q/33761770
      .then(stream => navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const audiooutput = devices.find(device => device.kind == "audiooutput");
          stream.getTracks().forEach(track => track.stop())
          if (audiooutput) {
            const constraints = {
              deviceId: {
                exact: audiooutput.deviceId
              }
            };
            return navigator.mediaDevices.getUserMedia({
              audio: constraints
            });
          }
          return navigator.mediaDevices.getUserMedia({
            audio: true
          });
        }))
	.then( function (stream){startUserMedia(stream)});
	}
	speechSynthesis.speak(tts);
