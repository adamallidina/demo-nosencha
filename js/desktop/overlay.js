(function () {
	function ClikOverlay (clikDesktop) {
		var WARNING_ICON = 'http://' + clik.utils.rootDomain + '/js/desktop/img/icon_warning.png';
		clik.utils.preloadImage(WARNING_ICON);

		var self = this,
			hasCode = false,
			isLoaded = false;

		self.oldState = null;
		self.state = null;

		clikDesktop.eventBus.bind('confmanager.success', function () {
			hasCode = false;

			clik.utils.preloadImage(clik.clikCodeURL(), function () {
				hasCode = true;

				if (isLoaded) {
					self.setStateLoaded();
				}
			});
		});

		// UI elements:
		var halo, ball, stage,
			bgFill, bgOpacity,
			paper, paperEl;

		this.drawOverlay = function () {
			clearText();

			if ( !paper ) {
				return;
			}

			paper.clear();

			var stageImg = null;

			if (Raphael.vml) {
				var ieZoom = screen.deviceXDPI / screen.logicalXDPI;

				if ((ieZoom % 1) !== 0) {
					stageImg = getStageHackImage();
					stageImg.style.display = 'none';
				}
			}

			if (bgFill && bgOpacity) {
				paper.rect(0, 0, '100%', '100%').attr({
					'fill'        : bgFill,
					'fill-opacity': bgOpacity
				});
			}

			if ((self.state !== 'hidden') && (self.state !== null)) {
				paperEl.style.display = 'block';

				// Draw the halo
				var haloScaled = scaledToWindow(haloScale),
					haloPos    = centeredInWindow(0);

				halo = paper.circle(haloPos.x, haloPos.y, haloScaled);

				halo.attr({
					'fill'          : '#121212',
					'fill-opacity'  : 0.1      ,
					'stroke-width'  : 0        ,
					'stroke-opacity': 0.1
				});

				// Draw the ball
				var ballScaled = scaledToWindow(ballScale),
					ballPos    = centeredInWindow(0);

				if (ball) {
					ball.stop();
				}

				ball = paper.circle(ballPos.x, ballPos.y, ballScaled);

				ball.attr({
					'fill'           : '300-#fefefe:50-#e9ecef-#e9ebee',
					'stroke-width'   : 0,
					'stroke-opacity' : 0
				});

				// Draw the stage

				var stageScaled = scaledToWindow(stageScale),
					stagePos    = centeredInWindow(stageScaled);

				if (self.state == 'error') {
					if (stageImg !== null) {
						stageImg.style.width = stageScaled + 'px';
						stageImg.style.height = stageScaled + 'px';
						stageImg.style.left = stagePos.x + 'px';
						stageImg.style.top = stagePos.y + 'px';
						stageImg.src = WARNING_ICON;
						stageImg.style.display = 'block';
					}
					else {
						stage = paper.image(
							WARNING_ICON,
							stagePos.x,
							stagePos.y,
							stageScaled,
							stageScaled
						);
					}

					if (errTitle) {
						spamText(0.65, 0.0666, errTitle, 'title');
					}

					if (errDescription) {
						spamText(0.74, 0.033, errDescription, 'description');
					}
				}

				else if (self.state == 'loading') {
					var windowCenter = centeredInWindow(0),
						armCount     = 8,
						armWidth     = scaledToWindow(0.022),
						outerRadius  = scaledToWindow(0.132 / 2) - (armWidth / 2),
						innerRadius  = outerRadius - scaledToWindow(0.037 / 2),
						beta         = 2 * Math.PI / armCount,
						cx           = windowCenter.x,
						cy           = windowCenter.y,
						sectors      = [],
						opacity      = [],
						pathParams   = {
							'stroke'        : '#1e2947',
							'stroke-width'  : armWidth,
							'stroke-linecap': 'round'
						};

					stage = paper.rect(windowCenter.x, windowCenter.y, 0, 0);

					stage.attr({
						'stroke-width'  : 0,
						'stroke-opacity': 0
					});

					for (var i=0; i<armCount; i++) {
						var alpha = beta * i - Math.PI / 2,
							cos   = Math.cos(alpha),
							sin   = Math.sin(alpha);

						opacity[i] = 1 / armCount * i;

						sectors[i] = paper
							.path([
								[
									'M',
									cx + innerRadius * cos,
									cy + innerRadius * sin
								],
								[
									'L',
									cx + outerRadius * cos,
									cy + outerRadius * sin
								]
							])
							.attr(pathParams);
					}

					var ticker = function () {
						opacity.unshift( opacity.pop() );

						for (var i=0; i<armCount; i++) {
							sectors[i].attr('opacity', opacity[i]);
						}

						paper.safari();

						if (self.state == 'loading') {
							tick = setTimeout(ticker, 600 / armCount);
						}
					};

					ticker();
				}

				else if ((self.state == 'loaded') || (self.state == 'sharing')) {
					if (stageImg !== null) {
						clik.log(stagePos.x + ',' + stagePos.y);

						stageImg.style.width = stageScaled + 'px';
						stageImg.style.height = stageScaled + 'px';
						stageImg.style.left = stagePos.x + 'px';
						stageImg.style.top = stagePos.y + 'px';
						stageImg.src = clik.clikCodeURL();
						stageImg.style.display = 'block';
					}

					else {
						stage = paper.image(
							clik.clikCodeURL(),
							stagePos.x,
							stagePos.y,
							stageScaled,
							stageScaled
						);
					}
				}
			}

			paper.safari();
		};

		injectPaperElement('clik-paper', function (el) {
			paperEl = el;
			paperEl.style.display = 'none';
			self.paper = paper = Raphael('clik-paper', '100%', '100%');
			self.drawOverlay();
		});

		/*
			Window dimensions handling.
		*/
		var windowSize = clik.utils.dom.windowSize(),
			wh = windowSize.height,
			ww = windowSize.width;

		clik.utils.dom.bind(window, 'resize', function () {
			windowSize = clik.utils.dom.windowSize();
			wh = windowSize.height;
			ww = windowSize.width;

			if (paper) {
				paper.setSize(ww, wh);
				self.drawOverlay();
			}
		});

		function scaledToWindow (x) {
			return Math.round(Math.min(ww, wh) * x);
		}

		function centeredInWindow (x) {
			return {
				x: Math.round((ww - x) / 2),
				y: Math.round((wh - x) / 2)
			};
		}

		/*
			Scaling entities
		*/
		var animTime = 200,
			haloScale, ballScale, stageScale,
			sec, secHalo;


		function setHaloScale (x) {
			// halo is a raphael circle, so we scale by radius. hide this detail.
			haloScale = x / 2;
		}

		function setBallScale (x) {
			// the white ball is too
			ballScale = x / 2;
		}

		function setStageScale (x) {
			stageScale = x;
		}

		setHaloScale(0.01);
		setBallScale(0.01);
		setStageScale(0.01);

		function animateRescale (dontEase, cb) {
			if (!paper || !halo) {
				return;
			}

			if (typeof dontEase !== 'boolean') {
				cb       = dontEase;
				dontEase = false;
			}

			var easing      = dontEase ? 'linear' : 'backOut',
				haloScaled  = scaledToWindow(haloScale),
				stageScaled = scaledToWindow(stageScale),
				stagePos    = centeredInWindow(stageScaled),
				growAnim    = halo.animate({
					r: haloScaled
				}, animTime, easing);

			ball.stop().animateWith(halo, growAnim, {
				r: scaledToWindow(ballScale)
			}, animTime, easing);

			stage.stop().animateWith(halo, growAnim, {
				x      : stagePos.x,
				y      : stagePos.y,
				width  : stageScaled,
				height : stageScaled
			}, animTime, easing, cb);

			paper.safari();
		}


		this.scale = function (factor) {
			setHaloScale(haloScale * 2 * factor);
			setBallScale(ballScale * 2 * factor);
			setStageScale(stageScale * factor);
			animateRescale();
		};

		this.getQrSize = function () {
			var qrSize = Math.round(scaledToWindow(ballScale) * 2 * stageScale);

			if (ball) {
				qrSize += ' + ' + ball.attr('fill');
			}

			return qrSize;
		};

		this.setStateLoading = function () {
			setState('loading', function () {
				setHaloScale(0.293);
				setBallScale(0.213);
				setStageScale(0.132);
				animateRescale();
			});
		};

		this.setStateLoaded = function () {
			isLoaded = true;

			if (hasCode) {
				setState('loaded', function () {
					setHaloScale(0.913);
					setBallScale(0.823);
					setStageScale(0.548);

					animateRescale(function () {
						self.drawOverlay();
					});
				});
			}
		};

		this.setStateSharing = function (t) {
			t = t || 10000;

			setState('sharing', function () {
				setHaloScale(0.913);
				setBallScale(0.823);
				setStageScale(0.548);

				animateRescale(function () {
					self.drawOverlay();

					var arcTarget = scaledToWindow(ballScale),
						arcWidth = scaledToWindow(0.04);

					arcTarget -= (arcWidth / 2) - 1;

					var arcPos = centeredInWindow(arcTarget * 2);

					paper.customAttributes.arc = function (value, total, R) {
						var alpha = 360 / total * value,
							a = (90 - alpha) * Math.PI / 180,
							x = arcTarget + R * Math.cos(a),
							y = arcTarget - R * Math.sin(a);

						return {
							path: (total == value) ? [] : [
								['M', x, y],
								['A', R, R, -180, +(alpha < 180), 1, arcTarget, arcTarget - R]
							]
						};
					};

					sec = paper.path().attr({
						arc : [ 0.1, 60, arcTarget ]
					});

					sec
						.attr({
							'stroke'        : '#0086be',
							'stroke-opacity': 1        ,
							'stroke-width'  : arcWidth ,
							'stroke-linecap': 'round'
						})
						.translate(arcPos.x, arcPos.y);

					sec.animate(
						{ arc: [ 59.99, 60, arcTarget ] },
						t,
						function () {
							self.setStateHidden();
						}
					);
				});
			});
		};

		function clearText () {
			var errs = clik.utils.dom.byClass('errText');
			clik.utils.dom.remove(errs);
		}

		function spamText (textPos, textScale, text, textType) {
			var textPosScaled = scaledToWindow(textPos),
				textSize = scaledToWindow(textScale);

			var errText = document.createElement('div');
			errText.className = 'errText';
			errText.innerHTML = text;
			errText.style.position = 'fixed';
			errText.style.zIndex = '950';
			errText.style.color = '#FFF';
			errText.style.top = Math.round(textPosScaled - textSize * 0.12) + 'px';
			errText.style.fontFamily = '"Droid Sans", Helvetica, sans-serif';
			errText.style.fontSize = textSize + 'px';
			errText.style.width = '100%';
			errText.style.textAlign = 'center';

			clik._ready(function () {
				document.body.appendChild(errText);
			});

			var links = errText.getElementsByTagName('a');
			clik.utils.arr.forEach(links, function (link) {
				link.style.color = '#FFF';
			});

			if (textType === 'description') {
				errText.style.opacity = '0.6';
				errText.style.filter  = 'alpha(opacity=6)';
			}
		}

		var errTitle, errDescription, errInterval, tick;

		this.setStateError = function (title, description) {
			errTitle = title;
			errDescription = description;

			setState('error', function () {
				setHaloScale(0.293);
				setBallScale(0.213);
				setStageScale(0.132);

				animateRescale(function () {
					self.drawOverlay();

					if (errTitle || errDescription) {
						clearText();

						if (errTitle) {
							spamText(0.65, 0.0666, errTitle, 'title');
						}

						if (errDescription) {
							spamText(0.74, 0.033, errDescription, 'description');
						}
					}
				});
			});
		};

		this.hideError = function () {
			errTitle = null;
			errDescription = null;

			clearInterval(errInterval);

			if (self.state == 'error') {
				self[self.oldState == 'loaded' ? 'setStateLoaded' : 'setStateHidden']();
			}
		};

		this.reportError = function (o) {
			clik.log('Reporting: ' + o.text);

			self.setStateError(o.text, o.description);

			if (o.overlay) {
				bgFill = '#000000';
				bgOpacity = 0.6;
				self.drawOverlay();
			}

			var errTimer = o.timer,
				errTimerCb = o.callback;

			if (typeof errTimer !== 'undefined') {
				clik.log('Starting error timer: ' + errTimer);

				if (typeof errInterval !== 'undefined') {
					clearInterval(errInterval);
				}

				var now = +new Date();

				errInterval = setInterval(function () {
					if (+new Date() - now >= errTimer) {
						clearInterval(errInterval);

						if (typeof errTimerCb === 'function') {
							clik.log('Firing timer!');
							errTimerCb();
						}

						else {
							clik.close();
						}
					}
				}, 500);
			}
		};

		this.hasError = function () {
			return self.state == 'error';
		};

		this.setStateHidden = function () {
			setState('hidden', function () {
				setHaloScale(0.01);
				setBallScale(0.01);
				setStageScale(0.01);

				animateRescale(true, function () {
					self.drawOverlay();
					paperEl.style.display = 'none';
				});
			});
		};

		function getStageHackImage () {
			var stageId  = 'stageImg',
				stageImg = document.getElementById(stageId);

			if ( !stageImg ) {
				stageImg = document.createElement('img');
				stageImg.id = stageId;
				stageImg.style.position = 'absolute';
				stageImg.style.zIndex = '901';

				clik._ready(function () {
					document.body.appendChild(stageImg);
				});
			}

			return stageImg;
		}

		function setState (newState, callback) {
			var oldState = self.state;

			bgFill = null;
			bgOpacity = null;

			if (oldState == 'loading') {
				clearTimeout(tick);
			}

			if (sec) {
				sec.stop();
			}

			if (oldState != newState) {
				clik.log('Overlay: ' + oldState + ' -> ' + newState);

				self.oldState = oldState;
				self.state = newState;

				self.drawOverlay();
			}

			if (callback) {
				callback();
			}
		}
	}

	/* Set up the DOM element for Raphael */
	function injectPaperElement (paperName, callback) {
		var paperEl = document.getElementById(paperName);

		function response () {
			callback(paperEl);
		}

		if ( !paperEl ) {
			paperEl = document.createElement('div');
			paperEl.id = paperName;
			paperEl.style.zIndex = '900';
			paperEl.style.height = '100%';
			paperEl.style.width = '100%';
			paperEl.style.position = 'fixed';
			paperEl.style.top = '0px';
			paperEl.style.left = '0px';

			clik._ready(function () {
				document.body.appendChild(paperEl);
				response();
			});
		}

		else {
			response();
		}
	}

	clik._ClikOverlay = ClikOverlay;
})();
