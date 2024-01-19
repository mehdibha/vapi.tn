"use client";

import React, { type KeyboardEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { LoginModal } from "@/modules/auth/components/login-modal";
import { UserAvatar } from "@/modules/auth/components/user-avatar";
import { useSession } from "@/modules/auth/hooks";
import { api } from "@/trpc/react";

const addCommentSchema = z.object({
  message: z.string().min(1),
});

type AddCommentSchemaType = z.infer<typeof addCommentSchema>;

interface CreateCommentProps {
  postId: string | null;
}

export const CreateComment = (props: CreateCommentProps) => {
  const { postId } = props;

  const utils = api.useUtils();
  const { data: userData, status } = useSession();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const form = useForm<AddCommentSchemaType>({
    defaultValues: {
      message: "",
    },
    resolver: zodResolver(addCommentSchema),
  });

  const addComment = api.comments.add.useMutation({
    onMutate: async (newComment) => {
      await utils.post.infinitePosts.cancel();
      // @ts-expect-error No id in comment fix later
      utils.post.infinitePosts.setInfiniteData({ limit: 10, search: "" }, (data) => {
        if (!data) {
          return data;
        }
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  comments: [
                    ...post.comments,
                    {
                      ...newComment,
                      author: {
                        name: userData?.user.name ?? "",
                        image: userData?.user.image ?? null,
                      },
                    },
                  ],
                };
              }
              return post;
            }),
          })),
        };
      });
      form.reset();
    },
    onError: () => {
      // TODO if error remove comment
    },
    onSettled: async () => {
      await utils.post.infinitePosts.invalidate();
    },
  });

  const onSubmit: SubmitHandler<AddCommentSchemaType> = (values) => {
    if (!postId) return;
    addComment.mutate({
      message: values.message,
      postId: postId,
    });
  };

  const handleKeyDown = async (
    event: KeyboardEvent<HTMLTextAreaElement>
  ): Promise<void> => {
    if (event.key === "Enter") {
      event.preventDefault();
      await form.handleSubmit(onSubmit)();
    }
  };

  if (status === "authenticated") {
    return (
      <div className="flex space-x-4">
        <UserAvatar />
        <div className="w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          ref={textareaRef}
                          placeholder="Ecrivez votre commentaire"
                          rows={1}
                          className="mt-1 min-h-0 w-full resize-none"
                          value={field.value}
                          onKeyDown={handleKeyDown}
                          onChange={(e) => {
                            if (!textareaRef.current) return;
                            field.onChange(e.target.value);
                            textareaRef.current.style.height = "auto";
                            textareaRef.current.style.height =
                              textareaRef.current.scrollHeight + 2 + "px";
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  );
                }}
              />
              <div className="mt-2 flex justify-end">
                <Button type="submit" size="sm">
                  Commenter
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="w-full">
        <LoginModal>
          <div className="mt-1 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground shadow-sm">
            Ecrivez votre commentaire
          </div>
        </LoginModal>
        <div className="mt-2 flex justify-end">
          <LoginModal>
            <Button size="sm">Commenter</Button>
          </LoginModal>
        </div>
      </div>
    );
  }

  return <div>CreateComment</div>;
};
