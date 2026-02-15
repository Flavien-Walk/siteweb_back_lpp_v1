import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, typographie, espacements, rayons } from '../constantes/theme';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <View style={styles.iconWrapper}>
            <Ionicons name="warning-outline" size={48} color={couleurs.danger} />
          </View>
          <Text style={styles.title}>Oups, quelque chose a plante</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Une erreur inattendue est survenue.'}
          </Text>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Ionicons name="refresh" size={18} color={couleurs.blanc} />
            <Text style={styles.buttonText}>Reessayer</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacements.xl,
    backgroundColor: couleurs.fond,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacements.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: typographie.poids.semibold as '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginBottom: espacements.xl,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: couleurs.primaire,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
  },
  buttonText: {
    color: couleurs.blanc,
    fontSize: 15,
    fontWeight: typographie.poids.semibold as '600',
  },
});

export default ErrorBoundary;
