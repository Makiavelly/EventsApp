package users_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	"golang.org/x/crypto/bcrypt"
)

func (s *UsersService) PatchUser(
	ctx context.Context,
	actorUserID int,
	targetUserID int,
	patch domain.UserPatch,
) (domain.User, error) {
	if actorUserID != targetUserID {
		return domain.User{}, fmt.Errorf(
			"cannot update another user: %w",
			core_errors.ErrForbidden,
		)
	}

	if err := patch.Validate(); err != nil {
		return domain.User{}, fmt.Errorf("validate user patch: %w", err)
	}

	var passwordHash *string
	if patch.Password.Set {
		hashedPassword, err := bcrypt.GenerateFromPassword(
			[]byte(*patch.Password.Value),
			bcrypt.DefaultCost,
		)
		if err != nil {
			return domain.User{}, fmt.Errorf("hash password: %w", err)
		}

		hash := string(hashedPassword)
		passwordHash = &hash
	}

	var patchedUser domain.User
	patchOperation := func(operationContext context.Context) error {
		user, err := s.usersRepository.GetUser(operationContext, targetUserID)
		if err != nil {
			return fmt.Errorf("get user: %w", err)
		}

		if err := user.ApplyPatch(patch); err != nil {
			return fmt.Errorf("apply user patch: %w", err)
		}

		patchedUser, err = s.usersRepository.PatchUser(
			operationContext,
			targetUserID,
			user,
			passwordHash,
		)
		if err != nil {
			return fmt.Errorf("patch user: %w", err)
		}

		if passwordHash != nil {
			if err := s.sessionRevoker.RevokeUserSessions(
				operationContext,
				targetUserID,
			); err != nil {
				return fmt.Errorf("revoke user sessions: %w", err)
			}
		}

		return nil
	}

	if passwordHash != nil {
		if err := s.transactionManager.WithTransaction(ctx, patchOperation); err != nil {
			return domain.User{}, fmt.Errorf(
				"patch password and revoke sessions transaction: %w",
				err,
			)
		}
	} else if err := patchOperation(ctx); err != nil {
		return domain.User{}, err
	}

	return patchedUser, nil
}
