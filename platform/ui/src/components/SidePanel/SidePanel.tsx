import classnames from 'classnames';
import PropTypes from 'prop-types';
import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { utils } from '@ohif/core';

import Icon from '../Icon';
import Tooltip from '../Tooltip';
import PatientInfo from '../PatientInfo';

type StyleMap = {
  open: {
    left: { marginLeft: string };
    right: { marginRight: string };
  };
  closed: {
    left: { marginLeft: string };
    right: { marginRight: string };
  };
};
const borderSize = 4;
const collapsedWidth = 25;
const closeIconWidth = 30;
const gridHorizontalPadding = 10;
const tabSpacerWidth = 2;

const baseClasses =
  'transition-all duration-300 ease-in-out bg-background border-white justify-start box-content flex flex-col';

const classesMap = {
  open: {
    left: `mr-1`,
    right: `ml-1`,
  },
  closed: {
    left: `mr-2 items-end`,
    right: `ml-2 items-start`,
  },
};

const openStateIconName = {
  left: 'side-panel-close-left',
  right: 'side-panel-close-right',
};

const getTabWidth = (numTabs: number) => {
  if (numTabs < 3) {
    return 68;
  } else {
    return 40;
  }
};

const getGridWidth = (numTabs: number, gridAvailableWidth: number) => {
  const spacersWidth = (numTabs - 1) * tabSpacerWidth;
  const tabsWidth = getTabWidth(numTabs) * numTabs;

  if (gridAvailableWidth > tabsWidth + spacersWidth) {
    return tabsWidth + spacersWidth;
  }

  return gridAvailableWidth;
};

const getNumGridColumns = (numTabs: number, gridWidth: number) => {
  if (numTabs === 1) {
    return 1;
  }

  // Start by calculating the number of tabs assuming each tab was accompanied by a spacer.
  const tabWidth = getTabWidth(numTabs);
  const numTabsWithOneSpacerEach = Math.floor(gridWidth / (tabWidth + tabSpacerWidth));

  // But there is always one less spacer than tabs, so now check if an extra tab with one less spacer fits.
  if (
    (numTabsWithOneSpacerEach + 1) * tabWidth + numTabsWithOneSpacerEach * tabSpacerWidth <=
    gridWidth
  ) {
    return numTabsWithOneSpacerEach + 1;
  }

  return numTabsWithOneSpacerEach;
};

const getGridStyle = (
  side: string,
  numTabs: number = 0,
  gridWidth: number,
  expandedWidth: number
): CSSProperties => {
  const relativePosition = Math.max(0, Math.floor(expandedWidth - gridWidth) / 2 - closeIconWidth);
  return {
    position: 'relative',
    ...(side === 'left' ? { right: `${relativePosition}px` } : { left: `${relativePosition}px` }),
    width: `${gridWidth}px`,
  };
};

const getTabClassNames = (
  numColumns: number,
  numTabs: number,
  tabIndex: number,
  isActiveTab: boolean,
  isTabDisabled: boolean
) =>
  classnames('h-[28px] mb-[2px] cursor-pointer text-black bg-white', {
    'hover:text-primary-active': !isActiveTab && !isTabDisabled,
    'rounded-l': tabIndex % numColumns === 0,
    'rounded-r': (tabIndex + 1) % numColumns === 0 || tabIndex === numTabs - 1,
  });

const getTabStyle = (numTabs: number) => {
  return {
    width: `${getTabWidth(numTabs)}px`,
  };
};

const getTabIconClassNames = (numTabs: number, isActiveTab: boolean) => {
  return classnames('h-full w-full flex items-center justify-center', {
    'bg-customblue-40': isActiveTab,
    rounded: isActiveTab,
  });
};
const createStyleMap = (
  expandedWidth: number,
  borderSize: number,
  collapsedWidth: number
): StyleMap => {
  const collapsedHideWidth = expandedWidth - collapsedWidth - borderSize;

  return {
    open: {
      left: { marginLeft: '0px' },
      right: { marginRight: '0px' },
    },
    closed: {
      left: { marginLeft: `-${collapsedHideWidth}px` },
      right: { marginRight: `-${collapsedHideWidth}px` },
    },
  };
};

const getToolTipContent = (label: string, disabled: boolean) => {
  return (
    <>
      <div>{label}</div>
      {disabled && <div className="text-white">{'Not available based on current context'}</div>}
    </>
  );
};

const createBaseStyle = (expandedWidth: number) => {
  return {
    maxWidth: `${expandedWidth}px`,
    width: `${expandedWidth}px`,
    // To align the top of the side panel with the top of the viewport grid, use position relative and offset the
    // top by the same top offset as the viewport grid. Also adjust the height so that there is no overflow.
    position: 'relative',
    top: '0.2%',
    height: '99.8%',
  };
};

const { formatDate, formatPN } = utils;

function usePatientInfo(servicesManager) {
  const { displaySetService } = servicesManager.services;

  const [patientInfo, setPatientInfo] = useState({
    PatientName: '',
    PatientID: '',
    PatientSex: '',
    PatientDOB: '',
  });
  const displaySets = displaySetService.getActiveDisplaySets();

  const checkMixedPatients = PatientID => {
    const displaySets = displaySetService.getActiveDisplaySets();
    displaySets.forEach(displaySet => {
      const instance = displaySet?.instances?.[0] || displaySet?.instance;
      if (!instance) {
        return;
      }
    });
  };

  const updatePatientInfo = () => {
    const displaySets = displaySetService.getActiveDisplaySets();
    const displaySet = displaySets[0];
    const instance = displaySet?.instances?.[0] || displaySet?.instance;
    if (!instance) {
      return;
    }
    setPatientInfo({
      PatientID: instance.PatientID || '',
      PatientName: instance.PatientName ? formatPN(instance.PatientName.Alphabetic) : '',
      PatientSex: instance.PatientSex || '',
      PatientDOB: formatDate(instance.PatientBirthDate) || '', //PatientAge
    });

    checkMixedPatients(instance.PatientID || '');
  };

  useEffect(() => {
    const subscription = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      () => updatePatientInfo()
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    updatePatientInfo();
  }, [displaySets]);

  return { patientInfo };
}

const formatWithEllipsis = (str, maxLength) => {
  if (str.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
};

const SidePanel = ({
  side,
  className,
  activeTabIndex: activeTabIndexProp,
  tabs,
  onOpen,
  expandedWidth = 248,
  servicesManager,
}) => {
  const { t } = useTranslation('SidePanel');

  const { patientInfo } = usePatientInfo(servicesManager);

  const formattedPatientName = formatWithEllipsis(patientInfo.PatientName, 27);
  const formattedPatientID = formatWithEllipsis(patientInfo.PatientID, 15);
  const formattedPatientSex = formatWithEllipsis(patientInfo.PatientSex, 15);
  const formattedPatientDOB = formatWithEllipsis(patientInfo.PatientDOB, 15);

  const [panelOpen, setPanelOpen] = useState(activeTabIndexProp !== null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const styleMap = createStyleMap(expandedWidth, borderSize, collapsedWidth);
  const baseStyle = createBaseStyle(expandedWidth);
  const gridAvailableWidth = expandedWidth - closeIconWidth - gridHorizontalPadding;
  const gridWidth = getGridWidth(tabs.length, gridAvailableWidth);
  const openStatus = panelOpen ? 'open' : 'closed';
  const style = Object.assign({}, styleMap[openStatus][side], baseStyle);

  const ActiveComponent = tabs[activeTabIndex]?.content;

  const updatePanelOpen = useCallback((panelOpen: boolean) => {
    setPanelOpen(panelOpen);
    if (panelOpen) {
      onOpen?.();
    }
  }, []);

  const updateActiveTabIndex = useCallback(
    (activeTabIndex: number) => {
      if (activeTabIndex === null) {
        updatePanelOpen(false);
        return;
      }

      setActiveTabIndex(activeTabIndex);
      updatePanelOpen(true);
    },
    [updatePanelOpen]
  );

  useEffect(() => {
    updateActiveTabIndex(activeTabIndexProp);
  }, [activeTabIndexProp, updateActiveTabIndex]);

  const getCloseStateComponent = () => {
    const _childComponents = Array.isArray(tabs) ? tabs : [tabs];
    return (
      <>
        <div
          className={classnames(
            'bg-background flex h-[28px] w-full cursor-pointer items-center rounded-md',
            side === 'left' ? 'justify-end pr-2' : 'justify-start pl-2'
          )}
          onClick={() => {
            updatePanelOpen(prev => !prev);
          }}
          data-cy={`side-panel-header-${side}`}
        >
          <Icon
            name={'navigation-panel-right-reveal'}
            className={classnames('text-primary-active', side === 'left' && 'rotate-180 transform')}
          />
        </div>
        <div className={classnames('mt-3 flex flex-col space-y-3')}>
          {_childComponents.map((childComponent, index) => (
            <Tooltip
              position={side === 'left' ? 'right' : 'left'}
              key={index}
              content={getToolTipContent(childComponent.label, childComponent.disabled)}
              className={classnames(
                'flex items-center',
                side === 'left' ? 'justify-end ' : 'justify-start '
              )}
            >
              <div
                id={`${childComponent.name}-btn`}
                data-cy={`${childComponent.name}-btn`}
                className="text-primary-active hover:cursor-pointer"
                onClick={() => {
                  return childComponent.disabled ? null : updateActiveTabIndex(index);
                }}
              >
                <Icon
                  name={childComponent.iconName}
                  className={classnames({
                    'text-primary-active': true,
                    'ohif-disabled': childComponent.disabled,
                  })}
                  style={{
                    width: '22px',
                    height: '22px',
                  }}
                />
              </div>
            </Tooltip>
          ))}
        </div>
      </>
    );
  };

  const getCloseIcon = () => {
    return (
      <div
        className={classnames(
          'flex h-[28px] cursor-pointer items-center justify-center',
          side === 'left' ? 'order-last' : 'order-first'
        )}
        style={{ width: `${closeIconWidth}px` }}
        onClick={() => {
          updatePanelOpen(prev => !prev);
        }}
        data-cy={`side-panel-header-${side}`}
      >
        <Icon
          name={openStateIconName[side]}
          className="text-primary-active"
        />
      </div>
    );
  };

  const getTabGridComponent = () => {
    const numCols = getNumGridColumns(tabs.length, gridWidth);

    return (
      <div className={classnames('flex grow ', side === 'right' ? 'justify-start' : 'justify-end')}>
        <div
          className={classnames('bg-primary-dark text-primary-active flex flex-wrap')}
          style={getGridStyle(side, tabs.length, gridWidth, expandedWidth)}
        >
          {tabs.map((tab, tabIndex) => {
            const { disabled } = tab;
            return (
              <React.Fragment key={tabIndex}>
                {tabIndex % numCols !== 0 && (
                  <div
                    className={classnames(
                      'flex h-[28px] w-[2px] items-center bg-white',
                      tabSpacerWidth
                    )}
                  >
                    <div className="bg-primary-dark h-[20px] w-full"></div>
                  </div>
                )}
                <Tooltip
                  position={'bottom'}
                  key={tabIndex}
                  content={getToolTipContent(tab.label, disabled)}
                >
                  <div
                    className={getTabClassNames(
                      numCols,
                      tabs.length,
                      tabIndex,
                      tabIndex === activeTabIndex,
                      disabled
                    )}
                    style={getTabStyle(tabs.length)}
                    onClick={() => {
                      return disabled ? null : updateActiveTabIndex(tabIndex);
                    }}
                    data-cy={`${tab.name}-btn`}
                  >
                    <div className={getTabIconClassNames(tabs.length, tabIndex === activeTabIndex)}>
                      <Icon
                        name={tab.iconName}
                        className={`${tab.disabled && 'ohif-disabled'}`}
                        style={{
                          width: '22px',
                          height: '22px',
                        }}
                      ></Icon>
                    </div>
                  </div>
                </Tooltip>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const getPatientDetails = () => {
    return (
      <div className="w-full pb-2 text-xs text-gray-400">
        <p className="font-bold text-white">Name: {formattedPatientName}</p>
        <p className="font-bold text-white">ID: {formattedPatientID}</p>
        <p className="mt-1 flex justify-between">
          <span>Sex: {formattedPatientSex}</span>
          <span>Age: {formattedPatientDOB}</span>
        </p>
      </div>
    );
  };

  const getOneTabComponent = () => {
    return (
      <div
        className={classnames('text-primary-active mt-1 w-full text-center text-sm')}
        style={{
          ...(side === 'left'
            ? { marginLeft: `${closeIconWidth}px` }
            : { marginRight: `${closeIconWidth}px` }),
        }}
        data-cy={`${tabs[0].name}-btn`}
        onClick={() => updatePanelOpen(prev => !prev)}
      >
        <span>{side === 'left' && getPatientDetails()}</span>
        <span>{side === 'right' && <span>{tabs[0].label}</span>}</span>
      </div>
    );
  };

  const getOpenStateComponent = () => {
    return (
      <div className="bg-button flex justify-between rounded py-1.5 pb-0.5">
        {getCloseIcon()}
        {tabs.length === 1 ? getOneTabComponent() : getTabGridComponent()}
      </div>
    );
  };

  return (
    <div
      className={classnames(className, baseClasses, classesMap[openStatus][side])}
      style={style}
    >
      {panelOpen ? (
        <>
          {getOpenStateComponent()}
          <ActiveComponent />
        </>
      ) : (
        <React.Fragment>{getCloseStateComponent()}</React.Fragment>
      )}
    </div>
  );
};

SidePanel.defaultProps = {
  defaultComponentOpen: null,
  activeTabIndex: null, // the default is to close the side panel
};

SidePanel.propTypes = {
  side: PropTypes.oneOf(['left', 'right']).isRequired,
  className: PropTypes.string,
  activeTabIndex: PropTypes.number,
  tabs: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        iconName: PropTypes.string.isRequired,
        iconLabel: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        content: PropTypes.func, // TODO: Should be node, but it keeps complaining?
      })
    ),
  ]),
  onOpen: PropTypes.func,
  expandedWidth: PropTypes.number,
  servicesManager: PropTypes.object.isRequired,
};

export default SidePanel;
