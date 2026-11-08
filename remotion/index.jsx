import React from 'react';
import {AbsoluteFill, Composition, registerRoot, useCurrentFrame} from 'remotion';
import {studies, draw, progressAt} from '../src/motion/motion.mjs';
import {drawTransition, drawTransitionThree, drawTransitionFour} from '../src/motion/transition.mjs';

function SceneOne() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <div style={{flex: 1, minHeight: 0}} dangerouslySetInnerHTML={{__html: draw(progressAt(frame))}} />
    </AbsoluteFill>
  );
}

function TransitionTwo() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        translate: '-1px 0px'
      }}
    >
      <div style={{flex: 1, minHeight: 0}} dangerouslySetInnerHTML={{__html: drawTransition(frame)}} />
    </AbsoluteFill>
  );
}

function TransitionThree() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <div style={{flex: 1, minHeight: 0}} dangerouslySetInnerHTML={{__html: drawTransitionThree(frame)}} />
    </AbsoluteFill>
  );
}

const components = {
  'Escena-1': SceneOne,
  'Transicion-2': TransitionTwo,
  'Transicion-3': TransitionThree,
  'Transicion-4': TransitionFour,
};

function TransitionFour() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <div style={{flex: 1, minHeight: 0}} dangerouslySetInnerHTML={{__html: drawTransitionFour(frame)}} />
    </AbsoluteFill>
  );
}

function Root() {
  return studies.map(({id, frames}) => (
    <Composition key={id} id={id} component={components[id]}
      width={1200} height={900} fps={30} durationInFrames={frames} />
  ));
}

registerRoot(Root);
