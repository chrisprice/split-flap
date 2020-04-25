export class PitchShift extends {
	private _delayA: Delay;
	private _lfoA: LFO;
	private _delayB: Delay;
	private _lfoB: LFO;
	private _crossFade: CrossFade;
	private _crossFadeLFO: LFO;
	private _feedbackDelay: Delay;
	readonly delayTime: Param<"time">;
	private _pitch: Interval;
	private _windowSize;

	constructor() {
        pitch: 0,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0
		this._frequency = new Signal({ context: this.context });
		this._delayA = new Delay({
			maxDelay: 1,
			context: this.context
		});
		this._lfoA = new LFO({
			context: this.context,
			min: 0,
			max: 0.1,
			type: "sawtooth"
		}).connect(this._delayA.delayTime);
		this._delayB = new Delay({
			maxDelay: 1,
			context: this.context
		});
		this._lfoB = new LFO({
			context: this.context,
			min: 0,
			max: 0.1,
			type: "sawtooth",
			phase: 180
		}).connect(this._delayB.delayTime);
		this._crossFade = new CrossFade({ context: this.context });
		this._crossFadeLFO = new LFO({
			context: this.context,
			min: 0,
			max: 1,
			type: "triangle",
			phase: 90
		}).connect(this._crossFade.fade);

		this.delayTime = this._feedbackDelay.delayTime;
		readOnly(this, "delayTime");
		this._pitch = options.pitch;

		this._windowSize = options.windowSize;

		// connect the two delay lines up
		this._delayA.connect(this._crossFade.a);
		this._delayB.connect(this._crossFade.b);
		// connect the frequency
		this._frequency.fan(this._lfoA.frequency, this._lfoB.frequency, this._crossFadeLFO.frequency);
		// route the input
		this.effectSend.fan(this._delayA, this._delayB);
		this._crossFade.chain(this._feedbackDelay, this.effectReturn);
		// start the LFOs at the same time
		const now = this.now();
		this._lfoA.start(now);
		this._lfoB.start(now);
		this._crossFadeLFO.start(now);
		// set the initial value
		this.windowSize = this._windowSize;
	}

	/**
	 * Repitch the incoming signal by some interval (measured in semi-tones).
	 * @example
	 * const pitchShift = new Tone.PitchShift().toDestination();
	 * const osc = new Tone.Oscillator().connect(pitchShift).start().toDestination();
	 * pitchShift.pitch = -12; // down one octave
	 * pitchShift.pitch = 7; // up a fifth
	 */
	get pitch() {
		return this._pitch;
	}
	set pitch(interval) {
		this._pitch = interval;
		let factor = 0;
		if (interval < 0) {
			this._lfoA.min = 0;
			this._lfoA.max = this._windowSize;
			this._lfoB.min = 0;
			this._lfoB.max = this._windowSize;
			factor = intervalToFrequencyRatio(interval - 1) + 1;
		} else {
			this._lfoA.min = this._windowSize;
			this._lfoA.max = 0;
			this._lfoB.min = this._windowSize;
			this._lfoB.max = 0;
			factor = intervalToFrequencyRatio(interval) - 1;
		}
		this._frequency.value = factor * (1.2 / this._windowSize);
	}

	/**
	 * The window size corresponds roughly to the sample length in a looping sampler.
	 * Smaller values are desirable for a less noticeable delay time of the pitch shifted
	 * signal, but larger values will result in smoother pitch shifting for larger intervals.
	 * A nominal range of 0.03 to 0.1 is recommended.
	 */
	get windowSize() {
		return this._windowSize;
	}
	set windowSize(size) {
		this._windowSize = this.toSeconds(size);
		this.pitch = this._pitch;
	}
};