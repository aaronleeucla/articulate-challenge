import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import nanoid from 'nanoid';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useAutoScrollTabIntoView, useControlVisibilityListener, useStyleModifiers, getWidthsOf } from "./TabBlock.hooks";
import styles from "./TabBlock.module.scss";

library.add(faChevronLeft, faChevronRight);
const LEFT = 'left';
const RIGHT = 'right';

//exportable pure functions for unit tests
export function calcNextTab(keyCode, item, array){
  const oldIndex = array.indexOf(item);
  const maxIndex = array.length;
  switch(keyCode){

    case 37: //left arrow, wraps to end
      return array[( oldIndex - 1 + maxIndex ) % maxIndex];

    case 39: //right arrow, modulo'ed to wrap to beginning
      return array[( oldIndex + 1 ) % maxIndex];

    default: return item;
  }
}

export function calcScrollAmount(currentPos, viewWidth, totalWidth, stepSize, direction){
  if ( direction === RIGHT ){

    //new offset position for one page
    const proposedPosition = currentPos + viewWidth;

    //adjust down the position by discrete length of one tab width
    const targetPosition = discretize(proposedPosition, stepSize) - 60;

    //don't want to overshoot the maximum width
    return Math.min(targetPosition, totalWidth - viewWidth);

  } else {
    //same logic but in the other direction
    const proposedPosition = currentPos - viewWidth;
    const targetPosition = discretize(proposedPosition, stepSize) + stepSize + 60;
    return Math.max(targetPosition, 0);
  }
}

export function discretize(totalLength, stepSize){
  const maxSteps = Math.floor(totalLength/stepSize);
  return maxSteps * stepSize;
}

TabBlock.defaultProps = {
  tabs: []
};

TabBlock.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    content: PropTypes.arrayOf(PropTypes.node).isRequired
  }))
};

export function TabBlock({ tabs }){

  const [selectedTab, setTab] = useState(tabs.length && tabs[0]);
  const tabListRef = useRef(null);

  useAutoScrollTabIntoView(tabListRef, tabs, selectedTab);

  const [
    showLeftControl,
    showRightControl
  ] = useControlVisibilityListener(tabListRef);

  //for keyboard users
  //CSS class inserts focus outline, removes on hover control
  useStyleModifiers('keyup', tabListRef, { remove: ['has-mouse', 'has-touch']});

  //for mouse users
  //removes the focus outline, ensures on hover control
  useStyleModifiers('mouseover', tabListRef, { add: ['has-mouse'], remove: ['has-touch'] });

  //for touch screen users
  //removes on hover controls, and allows tab list to be overflow-x scrollable
  useStyleModifiers('touchstart', tabListRef, { add: ['has-touch'] }, { passive: true });

  //handles key press of left and right arrow on tab list
  const navigateTab = (e) => {
    const keyDirection = e.keyCode;
    if ( isLeftOrRightArrowPress(keyDirection) )
      setTab(calcNextTab(keyDirection, selectedTab, tabs));
  };
  const isLeftOrRightArrowPress = (code) => code === 37 || code === 39;

  //handles mouse click of tab controls
  const scrollTabList = (direction) => {
    const tabsList = tabListRef.current;

    //calculates how much to scroll
    const { width, scrollWidth } = getWidthsOf(tabsList);
    const tabWidth = tabListRef.current.children[0].clientWidth;
    const scrollAmount = calcScrollAmount(tabsList.scrollLeft, width, scrollWidth, tabWidth, direction);

    tabsList.scrollTo({ left: scrollAmount, behavior: "smooth" })
  };

  //for unique HTML id across multiple TabBlock instance
  const [hashId] = useState(nanoid(5));
  const getId = (strArr) => strArr.concat(hashId).join('-');

  return (
    <div className={styles.container} aria-label="Tab">

      <div className={styles.tabsWrap}>

        <div
          className={cx(styles.tabList, 'has-mouse')}
          ref={tabListRef}
          role="tablist">

        { tabs.map(t => (
          <span role="tab"
            className={cx(styles.tab, { [styles.active]: t === selectedTab })}
            key={t.id}
            tabIndex={ t === selectedTab ? 0 : -1 }
            aria-selected={ t === selectedTab }
            id={getId([t.id])}
            aria-controls={getId([t.id, 'content'])}
            onKeyDown={navigateTab}
            onClick={() => setTab(t)}>
            <span>{t.title}</span>
          </span>
        ))}
        </div>

        <div className={styles.controls}>
          <CSSTransition
            className={cx(styles.controlWrapper, styles.leftCtrl)}
            in={showLeftControl}
            timeout={300}
            mountOnEnter>
            <div onClick={() => scrollTabList(LEFT)} role="button">
              <div className={styles.control}><FontAwesomeIcon icon="chevron-left"/></div>
            </div>
          </CSSTransition>
          <CSSTransition
            className={cx(styles.controlWrapper, styles.rightCtrl)}
            in={showRightControl}
            timeout={300}
            mountOnEnter>
            <div onClick={() => scrollTabList(RIGHT)} role="button" >
              <div className={styles.control}><FontAwesomeIcon icon="chevron-right"/></div>
            </div>
          </CSSTransition>
        </div>

      </div>

      <TransitionGroup className={styles.tabPanelWrapper}>
        <CSSTransition
          key={selectedTab.id}
          className={styles.tabPanel}
          role="tabpanel"
          aria-labelledby={getId([selectedTab.id])}
          id={getId([selectedTab.id, 'content'])}
          timeout={300}
          exit={false}>
          <div>{selectedTab.content}</div>
        </CSSTransition>
      </TransitionGroup>

    </div>
  )
}
