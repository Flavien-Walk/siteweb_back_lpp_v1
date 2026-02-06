/**
 * WidgetRenderer - Dispatch vers le bon renderer selon le type de widget
 */

import React from 'react';
import { StoryWidget } from '../../types/storyWidgets';
import LinkWidgetRenderer from './widgets/LinkWidgetRenderer';
import TextWidgetRenderer from './widgets/TextWidgetRenderer';
import TimeWidgetRenderer from './widgets/TimeWidgetRenderer';
import EmojiWidgetRenderer from './widgets/EmojiWidgetRenderer';
import LocationWidgetRenderer from './widgets/LocationWidgetRenderer';
import MentionWidgetRenderer from './widgets/MentionWidgetRenderer';

interface WidgetRendererProps {
  widget: StoryWidget;
  isEditing?: boolean;
  onLinkPress?: (url: string) => void;
  onMentionPress?: (userId: string) => void;
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  isEditing = false,
  onLinkPress,
  onMentionPress,
}) => {
  switch (widget.type) {
    case 'link':
      return (
        <LinkWidgetRenderer
          widget={widget}
          isEditing={isEditing}
          onPress={onLinkPress}
        />
      );

    case 'text':
      return <TextWidgetRenderer widget={widget} />;

    case 'time':
      return <TimeWidgetRenderer widget={widget} />;

    case 'emoji':
      return <EmojiWidgetRenderer widget={widget} />;

    case 'location':
      return <LocationWidgetRenderer widget={widget} />;

    case 'mention':
      return (
        <MentionWidgetRenderer
          widget={widget}
          isEditing={isEditing}
          onPress={onMentionPress}
        />
      );

    default:
      return null;
  }
};

export default WidgetRenderer;
